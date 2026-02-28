const { query } = require('../config/database');

/**
 * Middleware to require a specific role
 * @param {String|Array} roles - Role name(s) required
 */
const requireRole = (roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const roleArray = Array.isArray(roles) ? roles : [roles];

            // Get user's roles from database
            const result = await query(
                `SELECT r.name 
                 FROM roles r
                 INNER JOIN user_roles ur ON r.id = ur.role_id
                 WHERE ur.user_id = $1`,
                [req.user.userId]
            );

            const userRoles = result.rows.map(row => row.name);

            // Check if user has any of the required roles
            const hasRole = roleArray.some(role => userRoles.includes(role));

            if (!hasRole) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required role(s): ${roleArray.join(', ')}`
                });
            }

            // Attach roles to request for future use
            req.userRoles = userRoles;
            next();
        } catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

/**
 * Middleware to require a specific permission
 * @param {String|Array} permissions - Permission name(s) required
 */
const requirePermission = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

            // Get user's permissions from database
            const result = await query(
                `SELECT DISTINCT p.name 
                 FROM permissions p
                 INNER JOIN role_permissions rp ON p.id = rp.permission_id
                 INNER JOIN user_roles ur ON rp.role_id = ur.role_id
                 WHERE ur.user_id = $1`,
                [req.user.userId]
            );

            const userPermissions = result.rows.map(row => row.name);

            // Check if user has any of the required permissions
            const hasPermission = permissionArray.some(permission =>
                userPermissions.includes(permission)
            );

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required permission(s): ${permissionArray.join(', ')}`
                });
            }

            // Attach permissions to request for future use
            req.userPermissions = userPermissions;
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

/**
 * Middleware to require ALL specified permissions
 * @param {Array} permissions - Array of permission names required
 */
const requireAllPermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Get user's permissions from database
            const result = await query(
                `SELECT DISTINCT p.name 
                 FROM permissions p
                 INNER JOIN role_permissions rp ON p.id = rp.permission_id
                 INNER JOIN user_roles ur ON rp.role_id = ur.role_id
                 WHERE ur.user_id = $1`,
                [req.user.userId]
            );

            const userPermissions = result.rows.map(row => row.name);

            // Check if user has ALL required permissions
            const hasAllPermissions = permissions.every(permission =>
                userPermissions.includes(permission)
            );

            if (!hasAllPermissions) {
                const missingPermissions = permissions.filter(p => !userPermissions.includes(p));
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Missing permission(s): ${missingPermissions.join(', ')}`
                });
            }

            req.userPermissions = userPermissions;
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

/**
 * Middleware to check if user owns the resource or is admin
 * @param {String} resourceIdParam - Name of the route parameter containing resource ID
 */
const requireOwnershipOrAdmin = (resourceIdParam = 'id') => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const resourceId = req.params[resourceIdParam];

            // Check if user is admin
            const roleResult = await query(
                `SELECT r.name 
                 FROM roles r
                 INNER JOIN user_roles ur ON r.id = ur.role_id
                 WHERE ur.user_id = $1 AND r.name = 'admin'`,
                [req.user.userId]
            );

            const isAdmin = roleResult.rows.length > 0;
            const isOwner = req.user.userId === resourceId;

            if (!isAdmin && !isOwner) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only access your own resources.'
                });
            }

            req.isAdmin = isAdmin;
            req.isOwner = isOwner;
            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed'
            });
        }
    };
};

module.exports = {
    requireRole,
    requirePermission,
    requireAllPermissions,
    requireOwnershipOrAdmin
};
