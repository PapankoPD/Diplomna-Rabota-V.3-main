const express = require('express');
const router = express.Router();
const path = require('path');
const { query, getClient } = require('../config/database');
const { getStoragePath, getFullPath, deleteFile } = require('../config/storage');
const { formatFileSize, getDownloadHeaders } = require('../utils/fileUtils');
const { parseTaxonomyIds, assignTaxonomy } = require('../utils/taxonomyHelpers');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { uploadMiddleware } = require('../middleware/upload');
const { uploadMultiMiddleware } = require('../middleware/uploadMulti');
const {
    requireViewPermission,
    requireEditPermission,
    requireDeletePermission
} = require('../middleware/materialPermissions');
const {
    validateMaterialUpload,
    validateMaterialUpdate,
    validateCategoryCreation,
    validateMaterialPermissionGrant,
    validateUUID,
    validatePagination
} = require('../middleware/validation');
const { createVersion, getVersions, restoreVersion } = require('../utils/versioning');

/**
 * POST /api/materials
 * Upload a new material
 */
router.post('/', authenticate, requirePermission('materials:create'), uploadMiddleware, validateMaterialUpload, async (req, res) => {
    const client = await getClient();

    try {
        const { title, description, isPublic } = req.body;
        const taxonomy = parseTaxonomyIds(req);
        const file = req.file;
        const userId = req.user.userId;

        // Calculate relative path for storage
        const relativePath = path.join(getStoragePath(), file.filename);

        await client.query('BEGIN');

        // Insert material
        const materialResult = await client.query(
            `INSERT INTO materials (title, description, file_name, file_path, file_type, file_size, uploaded_by, is_public)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, title, description, file_name, file_type, file_size, is_public, created_at`,
            [title, description || null, file.originalname, relativePath, file.mimetype, file.size, userId, isPublic === 'true' || isPublic === true]
        );

        const material = materialResult.rows[0];

        // Assign taxonomy (subjects, topics, grades, categories)
        await assignTaxonomy(client, material.id, taxonomy);

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Material uploaded successfully',
            data: {
                material: {
                    ...material,
                    file_size_formatted: formatFileSize(material.file_size)
                }
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Material upload error:', error);

        // Clean up uploaded file on error
        if (req.file) {
            try {
                const relativePath = path.join(getStoragePath(), req.file.filename);
                await deleteFile(relativePath);
            } catch (cleanupError) {
                console.error('Failed to clean up file:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload material'
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/materials/batch
 * Upload multiple materials at once
 */
router.post('/batch', authenticate, requirePermission('materials:create'), uploadMultiMiddleware, async (req, res) => {
    const client = await getClient();

    try {
        const { title, description, isPublic } = req.body;
        const taxonomy = parseTaxonomyIds(req);
        const files = req.files;
        const userId = req.user.userId;

        await client.query('BEGIN');

        const createdMaterials = [];

        for (const file of files) {
            const relativePath = path.join(getStoragePath(), file.filename);

            // Use original filename (without extension) as title if no title provided
            const fileTitle = title || file.originalname.split('.').slice(0, -1).join('.');

            const materialResult = await client.query(
                `INSERT INTO materials (title, description, file_name, file_path, file_type, file_size, uploaded_by, is_public)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, title, description, file_name, file_type, file_size, is_public, created_at`,
                [fileTitle, description || null, file.originalname, relativePath, file.mimetype, file.size, userId, isPublic === 'true' || isPublic === true]
            );

            const material = materialResult.rows[0];

            // Assign taxonomy if provided
            await assignTaxonomy(client, material.id, taxonomy);

            createdMaterials.push({
                ...material,
                file_size_formatted: formatFileSize(material.file_size)
            });
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: `${createdMaterials.length} material(s) uploaded successfully`,
            data: {
                materials: createdMaterials
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Batch upload error:', error);

        // Clean up uploaded files on error
        if (req.files) {
            for (const file of req.files) {
                try {
                    const relativePath = path.join(getStoragePath(), file.filename);
                    await deleteFile(relativePath);
                } catch (cleanupError) {
                    console.error('Failed to clean up file:', cleanupError);
                }
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to upload materials'
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/materials
 * List materials with filtering and pagination
 */
router.get('/', validatePagination, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
        const offset = (page - 1) * limit;

        const search = req.query.search || '';
        const category = req.query.category || '';
        const fileType = req.query.fileType || '';
        const validSortFields = ['created_at', 'title', 'download_count', 'average_rating'];
        const sortBy = validSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
        const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Build dynamic WHERE clause
        let whereConditions = ['1=1'];
        let params = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            whereConditions.push(`(m.title LIKE $${paramCount} OR m.description LIKE $${paramCount})`);
            params.push(`%${search}%`);
        }

        if (fileType) {
            paramCount++;
            whereConditions.push(`m.file_type LIKE $${paramCount}`);
            params.push(`%${fileType}%`);
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ');

        // Get materials
        params.push(limit, offset);
        const result = await query(
            `SELECT 
                m.id,
                m.title,
                m.description,
                m.file_name,
                m.file_type,
                m.file_size,
                m.is_public,
                m.download_count,
                m.average_rating,
                m.rating_count,
                m.uploaded_by,
                u.username AS uploader_username,
                m.created_at,
                m.updated_at,
                COALESCE(
                    (SELECT json_group_array(json_object('id', mc.id, 'name', mc.name))
                     FROM material_tags mt
                     JOIN material_categories mc ON mt.category_id = mc.id
                     WHERE mt.material_id = m.id),
                    '[]'
                ) AS categories
             FROM materials m
             LEFT JOIN users u ON m.uploaded_by = u.id
             ${whereClause}
             ORDER BY m.${sortBy} ${sortOrder}
             LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
            params
        );

        // Get total count for pagination
        const countResult = await query(
            `SELECT COUNT(*) as total FROM materials m ${whereClause}`,
            params.slice(0, paramCount)
        );

        const materials = result.rows.map(m => ({
            ...m,
            file_size_formatted: formatFileSize(m.file_size),
            categories: typeof m.categories === 'string' ? JSON.parse(m.categories) : m.categories
        }));

        res.json({
            success: true,
            data: materials,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0]?.total || 0),
                totalPages: Math.ceil(parseInt(countResult.rows[0]?.total || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Get materials error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve materials'
        });
    }
});

/**
 * GET /api/materials/:id
 * Get single material details
 */
router.get('/:id', authenticate, validateUUID(), requireViewPermission, async (req, res) => {
    try {
        const materialId = req.params.id;
        const duration = parseInt(req.query.duration) || 0;

        const result = await query(
            `SELECT 
                m.id,
                m.title,
                m.description,
                m.file_name,
                m.file_type,
                m.file_size,
                m.is_public,
                m.download_count,
                m.average_rating,
                m.rating_count,
                m.uploaded_by,
                u.username AS uploader_username,
                u.email AS uploader_email,
                m.created_at,
                m.updated_at,
                COALESCE(
                    (SELECT json_group_array(json_object('id', mc.id, 'name', mc.name))
                     FROM material_tags mt
                     JOIN material_categories mc ON mt.category_id = mc.id
                     WHERE mt.material_id = m.id),
                    '[]'
                ) AS categories
             FROM materials m
             LEFT JOIN users u ON m.uploaded_by = u.id
             WHERE m.id = $1`,
            [materialId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = result.rows[0];

        // Track view activity (async, don't wait)
        const { trackView } = require('../utils/activityTracker');
        trackView(req.user.userId, materialId, duration).catch(err =>
            console.error('Failed to track view:', err)
        );

        res.json({
            success: true,
            data: {
                material: {
                    ...material,
                    file_size_formatted: formatFileSize(material.file_size),
                    categories: typeof material.categories === 'string' ? JSON.parse(material.categories) : material.categories
                }
            }
        });
    } catch (error) {
        console.error('Get material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve material'
        });
    }
});

/**
 * PUT /api/materials/:id
 * Update material metadata
 */
router.put('/:id', authenticate, validateUUID(), requireEditPermission, validateMaterialUpdate, async (req, res) => {
    const client = await getClient();

    try {
        const materialId = req.params.id;
        const { title, description, categoryIds, isPublic } = req.body;

        await client.query('BEGIN');

        // Create version snapshot before update
        await createVersion(materialId, req.user.userId, req.body.changeReason || 'Material update');

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 0;

        if (title !== undefined) {
            paramCount++;
            updates.push(`title = $${paramCount}`);
            values.push(title);
        }

        if (description !== undefined) {
            paramCount++;
            updates.push(`description = $${paramCount}`);
            values.push(description);
        }

        if (isPublic !== undefined) {
            paramCount++;
            updates.push(`is_public = $${paramCount}`);
            values.push(isPublic);
        }

        if (updates.length > 0) {
            values.push(materialId);
            const updateQuery = `UPDATE materials SET ${updates.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`;
            await client.query(updateQuery, values);
        }

        // Update categories if provided
        if (categoryIds !== undefined && Array.isArray(categoryIds)) {
            // Remove existing tags
            await client.query('DELETE FROM material_tags WHERE material_id = $1', [materialId]);

            // Add new tags
            for (const categoryId of categoryIds) {
                await client.query(
                    'INSERT INTO material_tags (material_id, category_id) VALUES ($1, $2)',
                    [materialId, categoryId]
                );
            }
        }

        await client.query('COMMIT');

        // Fetch updated material
        const result = await query(
            `SELECT * FROM materials WHERE id = $1`,
            [materialId]
        );

        res.json({
            success: true,
            message: 'Material updated successfully',
            data: {
                material: result.rows[0]
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update material'
        });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/materials/:id
 * Delete a material
 */
router.delete('/:id', authenticate, validateUUID(), requireDeletePermission, async (req, res) => {
    try {
        const materialId = req.params.id;

        // Get file path before deleting
        const materialResult = await query(
            'SELECT file_path FROM materials WHERE id = $1',
            [materialId]
        );

        if (materialResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const filePath = materialResult.rows[0].file_path;

        // Delete from database (cascades to permissions and tags)
        await query('DELETE FROM materials WHERE id = $1', [materialId]);

        // Delete file from storage
        try {
            await deleteFile(filePath);
        } catch (fileError) {
            console.error('Failed to delete file from storage:', fileError);
            // Continue anyway since DB record is deleted
        }

        res.json({
            success: true,
            message: 'Material deleted successfully'
        });
    } catch (error) {
        console.error('Delete material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete material'
        });
    }
});

/**
 * GET /api/materials/:id/download
 * Download a material file
 */
router.get('/:id/download', authenticate, validateUUID(), requireViewPermission, async (req, res) => {
    try {
        const materialId = req.params.id;

        // Get material info
        const result = await query(
            'SELECT title, file_name, file_path, file_type FROM materials WHERE id = $1',
            [materialId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const { title, file_name, file_path, file_type } = result.rows[0];
        const fullPath = path.resolve(getFullPath(file_path));

        // Use the material title as the download filename, keeping the original extension
        const ext = path.extname(file_name);
        const downloadName = title ? `${title}${ext}` : file_name;

        // Check if file exists
        const fs = require('fs');
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Increment download counter
        await query(
            'UPDATE materials SET download_count = download_count + 1 WHERE id = $1',
            [materialId]
        );

        // Track download activity (async, don't wait)
        const { trackDownload } = require('../utils/activityTracker');
        trackDownload(req.user.userId, materialId).catch(err =>
            console.error('Failed to track download:', err)
        );

        // Set headers and send file
        const headers = getDownloadHeaders(downloadName, file_type);
        res.set(headers);
        res.sendFile(fullPath);
    } catch (error) {
        console.error('Download material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download material'
        });
    }
});

/**
 * POST /api/materials/:id/permissions
 * Grant permission to a user, role, or group for a material
 */
router.post('/:id/permissions', authenticate, validateUUID(), requireEditPermission, validateMaterialPermissionGrant, async (req, res) => {
    try {
        const materialId = req.params.id;
        const { userId, roleId, groupId, permissionType } = req.body;

        // Insert permission
        const result = await query(
            `INSERT INTO material_permissions (material_id, user_id, role_id, group_id, permission_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, material_id, user_id, role_id, group_id, permission_type, granted_at`,
            [materialId, userId || null, roleId || null, groupId || null, permissionType]
        );

        res.status(201).json({
            success: true,
            message: 'Permission granted successfully',
            data: {
                permission: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Grant permission error:', error);

        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                success: false,
                message: 'Permission already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to grant permission'
        });
    }
});

/**
 * GET /api/materials/categories/all
 * Get all material categories
 */
router.get('/categories/all', authenticate, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, name, description FROM material_categories ORDER BY name'
        );

        res.json({
            success: true,
            data: {
                categories: result.rows
            }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve categories'
        });
    }
});

/**
 * POST /api/materials/categories
 * Create a new category (admin only)
 */
router.post('/categories', authenticate, requirePermission('materials:admin'), validateCategoryCreation, async (req, res) => {
    try {
        const { name, description } = req.body;

        const result = await query(
            `INSERT INTO material_categories (name, description)
             VALUES ($1, $2)
             RETURNING id, name, description, created_at`,
            [name, description || null]
        );

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                category: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Create category error:', error);

        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
});

/**
 * GET /api/materials/:id/versions
 * Get version history of a material (owner/admin/editor)
 */
router.get('/:id/versions', authenticate, validateUUID(), requireViewPermission, async (req, res) => {
    try {
        const materialId = req.params.id;
        const versions = await getVersions(materialId);

        res.json({
            success: true,
            data: { versions }
        });
    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve version history'
        });
    }
});

/**
 * POST /api/materials/:id/versions/:versionId/restore
 * Restore a material to a specific version
 */
router.post('/:id/versions/:versionId/restore', authenticate, validateUUID(), requireEditPermission, async (req, res) => {
    const client = await getClient();
    try {
        const materialId = req.params.id;
        const versionId = req.params.versionId;
        const userId = req.user.userId;

        await client.query('BEGIN');

        await restoreVersion(materialId, versionId, userId);

        await client.query('COMMIT');

        // Fetch updated material to return
        const result = await query('SELECT * FROM materials WHERE id = $1', [materialId]);

        res.json({
            success: true,
            message: 'Material restored successfully',
            data: { material: result.rows[0] }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Restore version error:', error);
        res.status(500).json({
            success: false,
            message: (error.message === 'Version not found') ? 'Version not found' : 'Failed to restore version'
        });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/materials/:id/versions/:versionId
 * Delete a specific version from version history (owner/admin only)
 */
router.delete('/:id/versions/:versionId', authenticate, validateUUID(), requireEditPermission, async (req, res) => {
    try {
        const materialId = req.params.id;
        const versionId = req.params.versionId;

        // Check if version exists
        const versionResult = await query(
            'SELECT id FROM material_versions WHERE id = ? AND material_id = ?',
            [versionId, materialId]
        );

        if (versionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Version not found'
            });
        }

        // Delete the version
        await query(
            'DELETE FROM material_versions WHERE id = ? AND material_id = ?',
            [versionId, materialId]
        );

        res.json({
            success: true,
            message: 'Version deleted successfully'
        });
    } catch (error) {
        console.error('Delete version error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete version'
        });
    }
});

module.exports = router;
