const { query } = require('../config/database');

/**
 * Create a version snapshot of a material
 * @param {number} materialId - ID of the material to version
 * @param {number} userId - ID of the user creating the version (making the change)
 * @param {string} changeReason - Reason for the change
 * @returns {Promise<number>} The new version number
 */
async function createVersion(materialId, userId, changeReason = null) {
    try {
        // 1. Get current material state
        const materialResult = await query(
            'SELECT * FROM materials WHERE id = ?',
            [materialId]
        );

        if (materialResult.rows.length === 0) {
            throw new Error('Material not found');
        }

        const material = materialResult.rows[0];

        // 2. Get next version number
        const versionResult = await query(
            'SELECT MAX(version_number) as max_version FROM material_versions WHERE material_id = ?',
            [materialId]
        );

        const nextVersion = (versionResult.rows[0]?.max_version || 0) + 1;

        // 3. Insert into versions table
        await query(
            `INSERT INTO material_versions (
                material_id, version_number, title, description, 
                file_name, file_path, file_type, file_size, 
                is_public, changed_by, change_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                materialId,
                nextVersion,
                material.title,
                material.description,
                material.file_name,
                material.file_path,
                material.file_type,
                material.file_size,
                material.is_public,
                userId,
                changeReason
            ]
        );

        return nextVersion;
    } catch (error) {
        console.error('Error creating version:', error);
        throw error;
    }
}

/**
 * Get version history for a material
 * @param {number} materialId 
 * @returns {Promise<Array>} List of versions
 */
async function getVersions(materialId) {
    const result = await query(
        `SELECT v.*, u.username as changed_by_username 
         FROM material_versions v
         LEFT JOIN users u ON v.changed_by = u.id
         WHERE v.material_id = ?
         ORDER BY v.version_number DESC`,
        [materialId]
    );
    return result.rows;
}

/**
 * Restore a material to a specific version
 * @param {number} materialId 
 * @param {number} versionId 
 * @param {number} userId - User performing the restore
 */
async function restoreVersion(materialId, versionId, userId) {
    try {
        // 1. Get the version to restore
        const versionResult = await query(
            'SELECT * FROM material_versions WHERE id = ? AND material_id = ?',
            [versionId, materialId]
        );

        if (versionResult.rows.length === 0) {
            throw new Error('Version not found');
        }

        const version = versionResult.rows[0];

        // 2. Create a version of the CURRENT state (so we can undo the restore)
        await createVersion(materialId, userId, `Restoring to version ${version.version_number}`);

        // 3. Update material with version data
        await query(
            `UPDATE materials SET 
                title = ?, 
                description = ?, 
                file_name = ?, 
                file_path = ?, 
                file_type = ?, 
                file_size = ?, 
                is_public = ?
             WHERE id = ?`,
            [
                version.title,
                version.description,
                version.file_name,
                version.file_path,
                version.file_type,
                version.file_size,
                version.is_public,
                materialId
            ]
        );

        return true;
    } catch (error) {
        console.error('Error restoring version:', error);
        throw error;
    }
}

module.exports = {
    createVersion,
    getVersions,
    restoreVersion
};
