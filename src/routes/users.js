const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole, requirePermission, requireOwnershipOrAdmin } = require('../middleware/rbac');
const {
    validateUUID,
    validateRoleAssignment,
    validatePagination
} = require('../middleware/validation');

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticate, requireRole('admin'), validatePagination, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '10');
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await query('SELECT COUNT(*) FROM users');
        const totalUsers = parseInt(countResult.rows[0].count);

        // Get users with pagination
        const usersResult = await query(
            `SELECT id, email, username, is_verified, is_suspended, created_at, updated_at
             FROM users
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        // Get roles for each user
        const usersWithRoles = await Promise.all(
            usersResult.rows.map(async (user) => {
                const rolesResult = await query(
                    `SELECT r.id, r.name
                     FROM roles r
                     INNER JOIN user_roles ur ON r.id = ur.role_id
                     WHERE ur.user_id = $1`,
                    [user.id]
                );

                return {
                    ...user,
                    roles: rolesResult.rows
                };
            })
        );

        res.json({
            success: true,
            data: {
                users: usersWithRoles,
                pagination: {
                    page,
                    limit,
                    total: totalUsers,
                    totalPages: Math.ceil(totalUsers / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve users'
        });
    }
});

/**
 * GET /api/users/:id
 * Get user by ID (admin or own profile)
 */
router.get('/:id', authenticate, requireOwnershipOrAdmin(), validateUUID(), async (req, res) => {
    try {
        const userId = req.params.id;

        const userResult = await query(
            `SELECT id, email, username, is_verified, is_suspended, created_at, updated_at
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Get user's roles
        const rolesResult = await query(
            `SELECT r.id, r.name, r.description
             FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1`,
            [userId]
        );

        // Get user's permissions
        const permissionsResult = await query(
            `SELECT DISTINCT p.id, p.name, p.resource, p.action
             FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN user_roles ur ON rp.role_id = ur.role_id
             WHERE ur.user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                user: {
                    ...user,
                    roles: rolesResult.rows,
                    permissions: permissionsResult.rows
                }
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user'
        });
    }
});

/**
 * PUT /api/users/:id/roles
 * Update user roles (requires roles:manage permission)
 */
router.put('/:id/roles', authenticate, requirePermission('roles:manage'), validateUUID(), validateRoleAssignment, async (req, res) => {
    const client = await getClient();

    try {
        const userId = req.params.id;
        const { roleIds } = req.body;

        await client.query('BEGIN');

        // Check if user exists
        const userCheck = await client.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate all roleIds exist
        const placeholders = roleIds.map((_, i) => `$${i + 1}`).join(', ');
        const rolesCheck = await client.query(
            `SELECT id FROM roles WHERE id IN (${placeholders})`,
            roleIds
        );

        if (rolesCheck.rows.length !== roleIds.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'One or more role IDs are invalid'
            });
        }

        // Remove existing roles
        await client.query(
            'DELETE FROM user_roles WHERE user_id = $1',
            [userId]
        );

        // Assign new roles
        for (const roleId of roleIds) {
            await client.query(
                'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
                [userId, roleId]
            );
        }

        await client.query('COMMIT');

        // Get updated roles
        const updatedRoles = await query(
            `SELECT r.id, r.name, r.description
             FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            message: 'User roles updated successfully',
            data: {
                roles: updatedRoles.rows
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update user roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user roles'
        });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/users/:id
 * Delete user (requires users:delete permission)
 */
router.delete('/:id', authenticate, requirePermission('users:delete'), validateUUID(), async (req, res) => {
    try {
        const userId = req.params.id;

        // Prevent deleting own account
        if (userId === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        const result = await query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

/**
 * GET /api/users/:id/teacher-classes
 * Get classes assigned to a teacher
 */
router.get('/:id/teacher-classes', authenticate, requireRole('admin'), validateUUID(), async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await query(
            `SELECT c.id as class_id, c.name as class_name, g.id as grade_id, g.name as grade_name
             FROM teacher_class_assignments tca
             JOIN grade_classes c ON tca.class_id = c.id
             JOIN grades g ON c.grade_id = g.id
             WHERE tca.teacher_id = $1`,
            [userId]
        );
        res.json({ success: true, data: { classes: result.rows } });
    } catch (error) {
        console.error('Get teacher classes error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve teacher classes' });
    }
});

/**
 * PUT /api/users/:id/teacher-classes
 * Update user's teacher class assignments (max 6)
 */
router.put('/:id/teacher-classes', authenticate, requireRole('admin'), validateUUID(), async (req, res) => {
    const client = await getClient();
    try {
        const userId = req.params.id;
        const { classIds } = req.body;
        
        if (!Array.isArray(classIds)) {
            return res.status(400).json({ success: false, message: 'classIds must be an array' });
        }
        
        if (classIds.length > 6) {
            return res.status(400).json({ success: false, message: 'A teacher can be assigned to a maximum of 6 classes.' });
        }

        await client.query('BEGIN');

        // Delete existing
        await client.query('DELETE FROM teacher_class_assignments WHERE teacher_id = $1', [userId]);

        // Insert new
        for (const classId of classIds) {
            await client.query(
                'INSERT INTO teacher_class_assignments (teacher_id, class_id) VALUES ($1, $2)',
                [userId, classId]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Teacher classes updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update teacher classes error:', error);
        res.status(500).json({ success: false, message: 'Failed to update teacher classes' });
    } finally {
        client.release();
    }
});

/**
 * GET /api/users/students/unassigned
 * Get students not assigned to a class (or allow search by username/email)
 */
router.get('/students/unassigned', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { search = '' } = req.query;
        let queryParams = [];
        let whereClause = `
            WHERE u.id NOT IN (SELECT student_id FROM student_class_enrollments)
            AND r.name IN ('student', 'user')
        `;

        // If 'student' role doesn't exist, we fallback to 'user' in the query above.
        // It strictly requires that they do not have 'admin' or 'teacher' roles.
        // We ensure they only have student/user roles.

        if (search) {
            whereClause += ` AND (u.username LIKE $1 OR u.email LIKE $1)`;
            queryParams.push(`%${search}%`);
        }

        const result = await query(
            `SELECT DISTINCT u.id, u.username, u.email
             FROM users u
             JOIN user_roles ur ON u.id = ur.user_id
             JOIN roles r ON ur.role_id = r.id
             ${whereClause}
             ORDER BY u.username ASC
             LIMIT 50`,
            queryParams
        );

        res.json({
            success: true,
            data: { students: result.rows }
        });
    } catch (error) {
        console.error('Get unassigned students error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve unassigned students' });
    }
});

/**
 * PUT /api/users/:id/suspend
 * Toggle user suspension status (admin only)
 */
router.put('/:id/suspend', authenticate, requireRole('admin'), validateUUID(), async (req, res) => {
    try {
        const userId = req.params.id;

        if (userId === req.user.userId) {
            return res.status(400).json({ success: false, message: 'You cannot suspend your own account' });
        }

        const userResult = await query('SELECT is_suspended FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const newStatus = userResult.rows[0].is_suspended ? 0 : 1;
        await query('UPDATE users SET is_suspended = $1 WHERE id = $2', [newStatus, userId]);

        res.json({
            success: true,
            message: `User ${newStatus ? 'suspended' : 'reactivated'} successfully`,
            data: { is_suspended: newStatus }
        });
    } catch (error) {
        console.error('Toggle suspension error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle suspension status' });
    }
});

module.exports = router;
