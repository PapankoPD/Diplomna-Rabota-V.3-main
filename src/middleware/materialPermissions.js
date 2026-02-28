/**
 * Material Permissions Middleware
 * Updated to use centralized AccessControl logic
 */

const { checkMaterialAccess } = require('./accessControl');

/**
 * Middleware to require view permission for a material
 */
const requireViewPermission = async (req, res, next) => {
    try {
        const materialId = req.params.id;
        // User might be undefined for public routes if optionalAuth is used
        const userId = req.user?.userId;

        const hasPermission = await checkMaterialAccess(materialId, userId, 'view');

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this material'
            });
        }

        next();
    } catch (error) {
        console.error('View permission middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Permission check failed'
        });
    }
};

/**
 * Middleware to require edit permission for a material
 */
const requireEditPermission = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const materialId = req.params.id;
        const userId = req.user.userId;

        const hasPermission = await checkMaterialAccess(materialId, userId, 'edit');

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to edit this material'
            });
        }

        next();
    } catch (error) {
        console.error('Edit permission middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Permission check failed'
        });
    }
};

/**
 * Middleware to require delete permission for a material
 */
const requireDeletePermission = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const materialId = req.params.id;
        const userId = req.user.userId;

        const hasPermission = await checkMaterialAccess(materialId, userId, 'delete');

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this material'
            });
        }

        next();
    } catch (error) {
        console.error('Delete permission middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Permission check failed'
        });
    }
};

module.exports = {
    requireViewPermission,
    requireEditPermission,
    requireDeletePermission,
    // Export helper for direct use if needed
    canViewMaterial: (mid, uid) => checkMaterialAccess(mid, uid, 'view'),
    canEditMaterial: (mid, uid) => checkMaterialAccess(mid, uid, 'edit'),
    canDeleteMaterial: (mid, uid) => checkMaterialAccess(mid, uid, 'delete')
};
