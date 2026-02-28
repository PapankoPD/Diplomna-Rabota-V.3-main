/**
 * Group Management Routes
 * Handles group creation, membership, and management
 */

const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isGroupMember } = require('../middleware/accessControl');

/**
 * Middleware to check if user is group owner or admin
 */
const requireGroupAdmin = async (req, res, next) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.userId;

        // Check if user is system admin
        const sysAdminCheck = await query(
            `SELECT 1 FROM user_roles ur 
             JOIN roles r ON ur.role_id = r.id 
             WHERE ur.user_id = $1 AND r.name = 'admin'`,
            [userId]
        );

        if (sysAdminCheck.rows.length > 0) {
            req.isSystemAdmin = true;
            return next();
        }

        // Check if user is group owner or admin
        const groupRoleCheck = await query(
            `SELECT role FROM user_groups 
             WHERE user_id = $1 AND group_id = $2 
             AND role IN ('owner', 'admin')`,
            [userId, groupId]
        );

        if (groupRoleCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You do not have administrative privileges for this group'
            });
        }

        req.groupRole = groupRoleCheck.rows[0].role;
        next();
    } catch (error) {
        console.error('Group admin check error:', error);
        res.status(500).json({ success: false, message: 'Authorization check failed' });
    }
};

/**
 * GET /api/groups
 * List groups user belongs to (or all public groups)
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type = 'my' } = req.query; // 'my', 'public', 'all' (admin only)

        let sql = '';
        const params = [];

        if (type === 'public') {
            sql = `SELECT g.*, u.username as creator_name,
                   (SELECT COUNT(*) FROM user_groups WHERE group_id = g.id) as member_count
                   FROM groups g
                   LEFT JOIN users u ON g.created_by = u.id
                   WHERE g.is_public = 1`;
        } else if (type === 'all') {
            // Check admin
            const adminCheck = await query(
                `SELECT 1 FROM user_roles ur 
                 JOIN roles r ON ur.role_id = r.id 
                 WHERE ur.user_id = $1 AND r.name = 'admin'`,
                [userId]
            );

            if (adminCheck.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Admin access required' });
            }

            sql = `SELECT g.*, u.username as creator_name,
                   (SELECT COUNT(*) FROM user_groups WHERE group_id = g.id) as member_count
                   FROM groups g
                   LEFT JOIN users u ON g.created_by = u.id`;
        } else {
            // Default: 'my' groups
            sql = `SELECT g.*, ug.role as my_role, u.username as creator_name,
                   (SELECT COUNT(*) FROM user_groups WHERE group_id = g.id) as member_count
                   FROM groups g
                   JOIN user_groups ug ON g.id = ug.group_id
                   LEFT JOIN users u ON g.created_by = u.id
                   WHERE ug.user_id = $1`;
            params.push(userId);
        }

        const result = await query(sql, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('List groups error:', error);
        res.status(500).json({ success: false, message: 'Failed to list groups' });
    }
});

/**
 * POST /api/groups
 * Create a new group
 */
router.post('/', authenticate, async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');

        const { name, description, isPublic = false } = req.body;
        const userId = req.user.userId;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Group name is required' });
        }

        // Create group
        const groupResult = await client.query(
            `INSERT INTO groups (name, description, created_by, is_public)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, description, is_public`,
            [name, description, userId, isPublic ? 1 : 0]
        );

        const group = groupResult.rows[0];

        // Add creator as owner
        await client.query(
            `INSERT INTO user_groups (user_id, group_id, role)
             VALUES ($1, $2, 'owner')`,
            [userId, group.id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: group
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create group error:', error);
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ success: false, message: 'Group name already exists' });
        }
        res.status(500).json({ success: false, message: 'Failed to create group' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/groups/:id
 * Get group details and members
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.userId;

        // Check if user is member or if group is public or if user is system admin
        const isMember = await isGroupMember(userId, groupId);

        const groupResult = await query(
            `SELECT g.*, u.username as creator_name
             FROM groups g
             LEFT JOIN users u ON g.created_by = u.id
             WHERE g.id = $1`,
            [groupId]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        const group = groupResult.rows[0];

        // Access check
        if (!group.is_public && !isMember) {
            // Check system admin
            const adminCheck = await query(
                `SELECT 1 FROM user_roles ur 
                 JOIN roles r ON ur.role_id = r.id 
                 WHERE ur.user_id = $1 AND r.name = 'admin'`,
                [userId]
            );

            if (adminCheck.rows.length === 0) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        // Get members if user has access
        const membersResult = await query(
            `SELECT u.id, u.username, u.email, ug.role, ug.joined_at
             FROM user_groups ug
             JOIN users u ON ug.user_id = u.id
             WHERE ug.group_id = $1
             ORDER BY ug.role DESC, u.username ASC`,
            [groupId]
        );

        res.json({
            success: true,
            data: {
                ...group,
                members: membersResult.rows,
                is_member: isMember
            }
        });
    } catch (error) {
        console.error('Get group details error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve group details' });
    }
});

/**
 * POST /api/groups/:id/members
 * Add member to group
 */
router.post('/:id/members', authenticate, requireGroupAdmin, async (req, res) => {
    try {
        const groupId = req.params.id;
        const { userId, role = 'member' } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required' });
        }

        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        await query(
            `INSERT INTO user_groups (user_id, group_id, role)
             VALUES ($1, $2, $3)`,
            [userId, groupId, role]
        );

        res.json({
            success: true,
            message: 'Member added successfully'
        });
    } catch (error) {
        console.error('Add member error:', error);
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            return res.status(409).json({ success: false, message: 'User is already a member' });
        }
        res.status(500).json({ success: false, message: 'Failed to add member' });
    }
});

/**
 * DELETE /api/groups/:id/members/:userId
 * Remove member from group
 */
router.delete('/:id/members/:userId', authenticate, requireGroupAdmin, async (req, res) => {
    try {
        const groupId = req.params.id;
        const targetUserId = req.params.userId;
        const requestUserId = req.user.userId;

        // Prevent removing yourself if you are the only owner
        if (targetUserId == requestUserId) {
            const ownerCount = await query(
                `SELECT COUNT(*) as count FROM user_groups WHERE group_id = $1 AND role = 'owner'`,
                [groupId]
            );
            if (ownerCount.rows[0].count <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot leave group as the only owner. Transfer ownership or delete group.'
                });
            }
        }

        await query(
            `DELETE FROM user_groups WHERE group_id = $1 AND user_id = $2`,
            [groupId, targetUserId]
        );

        res.json({
            success: true,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove member' });
    }
});

/**
 * POST /api/groups/:id/join
 * Join a public group
 */
router.post('/:id/join', authenticate, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.userId;

        // Check if group is public
        const groupCheck = await query(
            'SELECT is_public FROM groups WHERE id = $1',
            [groupId]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        if (!groupCheck.rows[0].is_public) {
            return res.status(403).json({ success: false, message: 'Cannot join private group directly' });
        }

        await query(
            `INSERT INTO user_groups (user_id, group_id, role)
             VALUES ($1, $2, 'member')`,
            [userId, groupId]
        );

        res.json({
            success: true,
            message: 'Joined group successfully'
        });
    } catch (error) {
        console.error('Join group error:', error);
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            return res.status(409).json({ success: false, message: 'Already a member' });
        }
        res.status(500).json({ success: false, message: 'Failed to join group' });
    }
});

module.exports = router;
