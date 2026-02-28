/**
 * Centralized Access Control Middleware
 * Handles permission checks for resources including group-based access
 */

const { query } = require('../config/database');

/**
 * Check if a user is a member of a group
 * @param {string|number} userId 
 * @param {string|number} groupId 
 * @returns {Promise<boolean>}
 */
const isGroupMember = async (userId, groupId) => {
    try {
        const result = await query(
            'SELECT 1 FROM user_groups WHERE user_id = $1 AND group_id = $2',
            [userId, groupId]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error('Group membership check error:', error);
        return false;
    }
};

/**
 * Get all group IDs a user belongs to
 * @param {string|number} userId 
 * @returns {Promise<Array<number>>}
 */
const getUserGroups = async (userId) => {
    try {
        const result = await query(
            'SELECT group_id FROM user_groups WHERE user_id = $1',
            [userId]
        );
        return result.rows.map(row => row.group_id);
    } catch (error) {
        console.error('Get user groups error:', error);
        return [];
    }
};

/**
 * Unified check for material access
 * Checks: Public -> Owner -> Admin -> User Permission -> Role Permission -> Group Permission
 * 
 * @param {string|number} materialId 
 * @param {string|number} userId 
 * @param {string} permissionType - 'view', 'edit', 'delete'
 * @returns {Promise<boolean>}
 */
const checkMaterialAccess = async (materialId, userId, permissionType = 'view') => {
    try {
        // 1. Get material info
        const materialResult = await query(
            'SELECT uploaded_by, is_public FROM materials WHERE id = $1',
            [materialId]
        );

        if (materialResult.rows.length === 0) {
            return false;
        }

        const material = materialResult.rows[0];

        // 2. Public check (only for view)
        if (permissionType === 'view' && material.is_public) {
            return true;
        }

        // 3. Ownership check
        if (userId && material.uploaded_by == userId) {
            return true;
        }

        if (!userId) return false; // Authentication required beyond this point

        // 4. Admin check
        const adminCheck = await query(
            `SELECT EXISTS(
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1 AND r.name = 'admin'
            ) AS is_admin`,
            [userId]
        );

        if (adminCheck.rows[0]?.is_admin) {
            return true;
        }

        // 5. Consolidated Permission Check (User, Role, or Group)
        // complex query to check all 3 sources in one go
        const permissionCheck = await query(
            `SELECT EXISTS(
                SELECT 1 FROM material_permissions mp
                WHERE mp.material_id = $1
                AND mp.permission_type IN (${getPermissionTypes(permissionType)})
                AND (
                    mp.user_id = $2
                    OR 
                    mp.role_id IN (SELECT role_id FROM user_roles WHERE user_id = $2)
                    OR
                    mp.group_id IN (SELECT group_id FROM user_groups WHERE user_id = $2)
                )
            ) AS has_permission`,
            [materialId, userId]
        );



        return permissionCheck.rows[0]?.has_permission || false;

    } catch (error) {
        console.error('Access check error:', error);
        return false;
    }
};

/**
 * Helper to get relevant permission types
 * e.g. checking 'view' should also allow if user has 'edit' or 'delete' rights?
 * For now, strict mapping, but 'admin' permission type in DB overrides all.
 */
function getPermissionTypes(requestedType) {
    // If checking 'view', 'edit' or 'delete' permission also counts? 
    // Usually 'edit' implies 'view'.
    // The DB constraint is strict: 'view', 'edit', 'delete'.
    // But we might have a specific logic where 'edit' grants view access.

    // Let's assume hierarchy: delete > edit > view
    const hierarchy = {
        'view': ["'view'", "'edit'", "'delete'"],
        'edit': ["'edit'", "'delete'"],
        'delete': ["'delete'"]
    };

    return hierarchy[requestedType]?.join(', ') || `'${requestedType}'`;
}

module.exports = {
    checkMaterialAccess,
    isGroupMember,
    getUserGroups
};
