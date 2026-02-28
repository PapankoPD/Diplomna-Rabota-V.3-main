const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');
const {
    validateUUID,
    validateRoleCreation,
    validatePermissionAssignment
} = require('../middleware/validation');

/**
 * GET /api/roles
 * Get all roles (authenticated users)
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const rolesResult = await query(
            `SELECT r.id, r.name, r.description, r.created_at,
                    COUNT(DISTINCT ur.user_id) as user_count,
                    COUNT(DISTINCT rp.permission_id) as permission_count
             FROM roles r
             LEFT JOIN user_roles ur ON r.id = ur.role_id
             LEFT JOIN role_permissions rp ON r.id = rp.role_id
             GROUP BY r.id, r.name, r.description, r.created_at
             ORDER BY r.name`
        );

        // Fetch permissions for each role
        const rolesWithPermissions = await Promise.all(
            rolesResult.rows.map(async (role) => {
                const permissionsResult = await query(
                    `SELECT p.id, p.name, p.resource, p.action, p.description
                     FROM permissions p
                     INNER JOIN role_permissions rp ON p.id = rp.permission_id
                     WHERE rp.role_id = $1
                     ORDER BY p.resource, p.action`,
                    [role.id]
                );
                return {
                    ...role,
                    permissions: permissionsResult.rows
                };
            })
        );

        res.json({
            success: true,
            data: {
                roles: rolesWithPermissions
            }
        });
    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve roles'
        });
    }
});

/**
 * GET /api/roles/permissions/all
 * Get all available permissions (authenticated users)
 */
router.get('/permissions/all', authenticate, async (req, res) => {
    try {
        const permissionsResult = await query(
            `SELECT id, name, resource, action, description
             FROM permissions
             ORDER BY resource, action`
        );

        res.json({
            success: true,
            data: {
                permissions: permissionsResult.rows
            }
        });
    } catch (error) {
        console.error('Get permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve permissions'
        });
    }
});

/**
 * GET /api/roles/:id
 * Get role by ID with permissions
 */
router.get('/:id', authenticate, validateUUID(), async (req, res) => {
    try {
        const roleId = req.params.id;

        const roleResult = await query(
            'SELECT id, name, description, created_at FROM roles WHERE id = $1',
            [roleId]
        );

        if (roleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        const role = roleResult.rows[0];

        // Get permissions for this role
        const permissionsResult = await query(
            `SELECT p.id, p.name, p.resource, p.action, p.description
             FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             WHERE rp.role_id = $1
             ORDER BY p.resource, p.action`,
            [roleId]
        );

        res.json({
            success: true,
            data: {
                role: {
                    ...role,
                    permissions: permissionsResult.rows
                }
            }
        });
    } catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve role'
        });
    }
});

/**
 * POST /api/roles
 * Create new role (admin only)
 */
router.post('/', authenticate, requireRole('admin'), validateRoleCreation, async (req, res) => {
    try {
        const { name, description } = req.body;

        // Check if role already exists
        const existingRole = await query(
            'SELECT id FROM roles WHERE name = $1',
            [name]
        );

        if (existingRole.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Role with this name already exists'
            });
        }

        const result = await query(
            `INSERT INTO roles (name, description)
             VALUES ($1, $2)
             RETURNING id, name, description, created_at`,
            [name, description || null]
        );

        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: {
                role: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create role'
        });
    }
});

/**
 * PUT /api/roles/:id/permissions
 * Update role permissions (admin only)
 */
router.put('/:id/permissions', authenticate, requireRole('admin'), validateUUID(), validatePermissionAssignment, async (req, res) => {
    const client = await getClient();

    try {
        const roleId = req.params.id;
        const { permissionIds } = req.body;

        await client.query('BEGIN');

        // Check if role exists
        const roleCheck = await client.query(
            'SELECT id FROM roles WHERE id = $1',
            [roleId]
        );

        if (roleCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Validate all permissionIds exist
        const placeholders = permissionIds.map((_, i) => `$${i + 1}`).join(', ');
        const permissionsCheck = await client.query(
            `SELECT id FROM permissions WHERE id IN (${placeholders})`,
            permissionIds
        );

        if (permissionsCheck.rows.length !== permissionIds.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'One or more permission IDs are invalid'
            });
        }

        // Remove existing permissions
        await client.query(
            'DELETE FROM role_permissions WHERE role_id = $1',
            [roleId]
        );

        // Assign new permissions
        for (const permissionId of permissionIds) {
            await client.query(
                'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
                [roleId, permissionId]
            );
        }

        await client.query('COMMIT');

        // Get updated permissions
        const updatedPermissions = await query(
            `SELECT p.id, p.name, p.resource, p.action, p.description
             FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             WHERE rp.role_id = $1`,
            [roleId]
        );

        res.json({
            success: true,
            message: 'Role permissions updated successfully',
            data: {
                permissions: updatedPermissions.rows
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update role permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update role permissions'
        });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/roles/:id
 * Delete role (admin only)
 */
router.delete('/:id', authenticate, requireRole('admin'), validateUUID(), async (req, res) => {
    try {
        const roleId = req.params.id;

        // Protect default roles
        const roleCheck = await query(
            'SELECT name FROM roles WHERE id = $1',
            [roleId]
        );

        if (roleCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        const roleName = roleCheck.rows[0].name;
        const protectedRoles = ['admin', 'user', 'guest'];

        if (protectedRoles.includes(roleName)) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete protected role: ${roleName}`
            });
        }

        await query('DELETE FROM roles WHERE id = $1', [roleId]);

        res.json({
            success: true,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete role'
        });
    }
});


module.exports = router;
