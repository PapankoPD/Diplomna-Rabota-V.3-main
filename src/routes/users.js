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
            `SELECT id, email, username, is_verified, created_at, updated_at
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
            `SELECT id, email, username, is_verified, created_at, updated_at
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

module.exports = router;
