const express = require('express');
const router = express.Router();
const path = require('path');
const { query, getClient } = require('../config/database');
const { getStoragePath, getFullPath, deleteFile } = require('../config/storage');
const { formatFileSize, getDownloadHeaders } = require('../utils/fileUtils');
const { parseTaxonomyIds, assignTaxonomy } = require('../utils/taxonomyHelpers');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { uploadMiddleware, flexibleUploadMiddleware } = require('../middleware/upload');
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
/**
 * Create a new version of the current material state
 */
const createVersion = async (materialId, userId, reason) => {
    // 1. Get current material state
    const materialResult = await query(
        `SELECT m.*, u.username as uploader_username 
         FROM materials m 
         LEFT JOIN users u ON m.uploaded_by = u.id 
         WHERE m.id = $1`,
        [materialId]
    );

    if (materialResult.rows.length === 0) return;

    const m = materialResult.rows[0];

    // 2. Get current versions count to set version_number
    // We get the max version number or default to 0
    const countResult = await query(
        'SELECT COALESCE(MAX(version_number), 0) as max_v FROM material_versions WHERE material_id = $1',
        [materialId]
    );
    const nextVersion = parseInt(countResult.rows[0]?.max_v || 0) + 1;

    // 3. Insert into material_versions
    await query(
        `INSERT INTO material_versions (
            material_id, version_number, title, description,
            file_path, file_name, file_size, change_reason,
            changed_by, changed_by_username
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
            materialId, nextVersion, m.title, m.description,
            m.file_path, m.file_name, m.file_size, 
            reason || 'Material update', userId, m.uploader_username
        ]
    );
};

/**
 * Get version history for a material
 */
const getVersions = async (materialId) => {
    const result = await query(
        'SELECT * FROM material_versions WHERE material_id = $1 ORDER BY version_number DESC',
        [materialId]
    );
    return result.rows;
};

/**
 * Restore material to a specific version
 */
const restoreVersion = async (materialId, versionId, userId) => {
    // 1. Get version details
    const versionResult = await query(
        'SELECT * FROM material_versions WHERE id = $1 AND material_id = $2',
        [versionId, materialId]
    );

    if (versionResult.rows.length === 0) {
        throw new Error('Version not found');
    }

    const v = versionResult.rows[0];

    // 2. Take snapshot of current state before restoring
    await createVersion(materialId, userId, `System: Restore to v${v.version_number}`);

    // 3. Update material with version data
    await query(
        `UPDATE materials 
         SET title = $1, description = $2, file_path = $3, file_name = $4, file_size = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [v.title, v.description, v.file_path, v.file_name, v.file_size, materialId]
    );
};
const { emitNotificationToUser } = require('../config/socketManager');

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

        // Link to a specific grade class if provided
        const classId = req.body.classId ? parseInt(req.body.classId) : null;
        if (classId) {
            await client.query(
                `INSERT OR IGNORE INTO material_grade_classes (material_id, class_id) VALUES ($1, $2)`,
                [material.id, classId]
            );

            // Fetch all students enrolled in this class
            const studentsResult = await client.query(
                `SELECT student_id FROM student_class_enrollments WHERE class_id = $1`,
                [classId]
            );

            // Create notification for each student
            if (studentsResult.rows.length > 0) {
                const message = `New material uploaded to your class: ${material.title}`;
                const link = `/materials/${material.id}`; // Link to the specific material page
                const notificationType = 'material_upload';

                for (const student of studentsResult.rows) {
                    const notifResult = await client.query(
                        `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4) RETURNING id, user_id, type, message, link, is_read, created_at`,
                        [student.student_id, notificationType, message, link]
                    );
                    // Emit real-time notification to the connected student
                    emitNotificationToUser(student.student_id, notifResult.rows[0]);
                }
            }
        }

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

            // Link to a specific grade class if provided
            const classId = req.body.classId ? parseInt(req.body.classId) : null;
            if (classId) {
                await client.query(
                    `INSERT OR IGNORE INTO material_grade_classes (material_id, class_id) VALUES ($1, $2)`,
                    [material.id, classId]
                );
            }

            createdMaterials.push({
                ...material,
                file_size_formatted: formatFileSize(material.file_size)
            });
        }

        // Send a single notification for batch upload if assigned to a class
        const classId = req.body.classId ? parseInt(req.body.classId) : null;
        if (classId && createdMaterials.length > 0) {
            const studentsResult = await client.query(
                `SELECT student_id FROM student_class_enrollments WHERE class_id = $1`,
                [classId]
            );

            if (studentsResult.rows.length > 0) {
                const message = `${createdMaterials.length} new materials uploaded to your class.`;
                const link = `/materials`;
                const notificationType = 'batch_material_upload';

                for (const student of studentsResult.rows) {
                    const notifResult = await client.query(
                        `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4) RETURNING id, user_id, type, message, link, is_read, created_at`,
                        [student.student_id, notificationType, message, link]
                    );
                    // Emit real-time notification to the connected student
                    emitNotificationToUser(student.student_id, notifResult.rows[0]);
                }
            }
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
 * GET /api/materials/stats
 * Return per-user dashboard statistics (requires authentication)
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check user roles to determine if they are a student
        const rolesCheck = await query(
            `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1`,
            [userId]
        );
        const roles = rolesCheck.rows.map(r => r.name);
        const isStudent = roles.includes('student') || roles.includes('user');
        const isAdminOrTeacher = roles.includes('admin') || roles.includes('teacher');
        const isStrictStudent = isStudent && !isAdminOrTeacher;

        let totalMaterialsQuery = 'SELECT COUNT(*) AS count FROM materials WHERE (is_archived = 0 OR is_archived IS NULL)';
        let totalMaterialsParams = [];

        if (isStrictStudent) {
            const classCheck = await query(
                `SELECT class_id FROM student_class_enrollments WHERE student_id = $1`,
                [userId]
            );
            
            if (classCheck.rows.length > 0) {
                const studentClassId = classCheck.rows[0].class_id;
                totalMaterialsQuery = `
                    SELECT COUNT(DISTINCT m.id) AS count FROM materials m
                    WHERE EXISTS (
                        SELECT 1 FROM material_grade_classes mgc
                        WHERE mgc.material_id = m.id AND mgc.class_id = $1
                    ) AND (m.is_archived = 0 OR m.is_archived IS NULL)
                `;
                totalMaterialsParams = [studentClassId];
            } else {
                // If student has no class, they see public materials not assigned to any class
                totalMaterialsQuery = `
                    SELECT COUNT(DISTINCT m.id) AS count FROM materials m
                    WHERE (m.is_public = 1 AND NOT EXISTS (
                        SELECT 1 FROM material_grade_classes mgc WHERE mgc.material_id = m.id
                    )) AND (m.is_archived = 0 OR m.is_archived IS NULL)
                `;
            }
        }

        // Run all queries in parallel
        const [uploadsResult, downloadsResult, ratingsResult, totalResult] = await Promise.all([
            // How many materials has this user uploaded?
            query(
                'SELECT COUNT(*) AS count FROM materials WHERE uploaded_by = $1',
                [userId]
            ),
            // Total downloads BY this user
            query(
                "SELECT COUNT(*) AS total FROM user_activities WHERE user_id = $1 AND activity_type = 'download'",
                [userId]
            ),
            // How many ratings has this user given?
            query(
                'SELECT COUNT(*) AS count FROM material_ratings WHERE user_id = $1',
                [userId]
            ),
            // Total materials on the platform or assigned to student's class
            query(totalMaterialsQuery, totalMaterialsParams)
        ]);

        res.json({
            success: true,
            data: {
                uploadsCount: parseInt(uploadsResult.rows[0]?.count || 0),
                downloadsCount: parseInt(downloadsResult.rows[0]?.total || 0),
                ratingsGiven: parseInt(ratingsResult.rows[0]?.count || 0),
                totalMaterials: parseInt(totalResult.rows[0]?.count || 0)
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve stats' });
    }
});

/**
 * GET /api/materials
 * List materials with filtering and pagination
 */
router.get('/', authenticate, validatePagination, async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
        const offset = (page - 1) * limit;
        const userId = req.user.userId;

        const search = req.query.search || '';
        const category = req.query.category || '';
        const fileType = req.query.fileType || '';
        const subjectId = req.query.subjectId || '';
        const topicId = req.query.topicId || '';
        const gradeId = req.query.grade || ''; // Assuming grade filtering works by ID or code
        const validSortFields = ['created_at', 'title', 'download_count', 'average_rating'];
        const sortBy = validSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
        const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Check user roles
        const rolesCheck = await query(
            `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1`,
            [userId]
        );
        const roles = rolesCheck.rows.map(r => r.name);
        const isStudent = roles.includes('student') || roles.includes('user');
        const isAdminOrTeacher = roles.includes('admin') || roles.includes('teacher');
        const isStrictStudent = isStudent && !isAdminOrTeacher;

        // Fetch student's class if they are a student
        let studentClassId = null;
        if (isStrictStudent) {
            const classCheck = await query(
                `SELECT class_id FROM student_class_enrollments WHERE student_id = $1`,
                [userId]
            );
            if (classCheck.rows.length > 0) {
                studentClassId = classCheck.rows[0].class_id;
            }
        }

        // Build dynamic WHERE clause — never show archived materials in the default list
        let whereConditions = ['1=1', '(m.is_archived = 0 OR m.is_archived IS NULL)'];
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

        // Filter by subject if provided
        if (subjectId) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_subjects ms
                WHERE ms.material_id = m.id AND ms.subject_id = $${paramCount}
            )`);
            params.push(subjectId);
        }

        // Filter by topic if provided
        if (topicId) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_topics mt
                WHERE mt.material_id = m.id AND mt.topic_id = $${paramCount}
            )`);
            params.push(topicId);
        }

        // Filter by grade if provided
        if (gradeId) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_grades mg
                WHERE mg.material_id = m.id AND mg.grade_id = $${paramCount}
            )`);
            params.push(gradeId);
        }

        // Apply strict student filtering
        if (isStrictStudent) {
            if (studentClassId) {
                // Show ONLY materials that are specifically assigned to their class
                whereConditions.push(`EXISTS (SELECT 1 FROM material_grade_classes mgc WHERE mgc.material_id = m.id AND mgc.class_id = ${studentClassId})`);
            } else {
                // If student has no class, only show public materials that are NOT assigned to ANY class
                whereConditions.push(`(m.is_public = 1 AND NOT EXISTS (SELECT 1 FROM material_grade_classes mgc3 WHERE mgc3.material_id = m.id))`);
            }
        }

        const whereClause = 'WHERE ' + whereConditions.join(' AND ');

        // Get materials
        params.push(limit, offset);
        const result = await query(
            `SELECT DISTINCT
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
                '[]' AS categories
             FROM materials m
             LEFT JOIN users u ON m.uploaded_by = u.id
             ${whereClause}
             ORDER BY m.${sortBy} ${sortOrder}
             LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
            params
        );

        // Get total count for pagination
        const countResult = await query(
            `SELECT COUNT(DISTINCT m.id) as total FROM materials m ${whereClause}`,
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
 * GET /api/materials/archived
 * List archived materials for the current user (admin sees all)
 */
router.get('/archived', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check if admin
        const adminCheck = await query(
            `SELECT EXISTS(
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1 AND r.name = 'admin'
            ) AS is_admin`,
            [userId]
        );
        const isAdmin = adminCheck.rows[0]?.is_admin;

        let result;
        if (isAdmin) {
            result = await query(
                `SELECT m.id, m.title, m.description, m.file_name, m.file_type,
                        m.file_size, m.is_public, m.download_count, m.average_rating,
                        m.rating_count, m.uploaded_by, u.username AS uploader_username,
                        m.created_at, m.updated_at, m.is_archived
                 FROM materials m
                 LEFT JOIN users u ON m.uploaded_by = u.id
                 WHERE m.is_archived = 1
                 ORDER BY m.updated_at DESC`
            );
        } else {
            result = await query(
                `SELECT m.id, m.title, m.description, m.file_name, m.file_type,
                        m.file_size, m.is_public, m.download_count, m.average_rating,
                        m.rating_count, m.uploaded_by, u.username AS uploader_username,
                        m.created_at, m.updated_at, m.is_archived
                 FROM materials m
                 LEFT JOIN users u ON m.uploaded_by = u.id
                 WHERE m.is_archived = 1 AND m.uploaded_by = $1
                 ORDER BY m.updated_at DESC`,
                [userId]
            );
        }

        const materials = result.rows.map(m => ({
            ...m,
            file_size_formatted: formatFileSize(m.file_size)
        }));

        res.json({ success: true, data: { materials } });
    } catch (error) {
        console.error('Get archived materials error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve archived materials' });
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
                '[]' AS categories
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
 * Update material metadata and optionally the file itself
 */
router.put('/:id', authenticate, validateUUID(), requireEditPermission, flexibleUploadMiddleware, validateMaterialUpdate, async (req, res) => {
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
            values.push(isPublic === 'true' || isPublic === true);
        }

        // If a new file was uploaded, update file fields
        let oldFilePath = null;
        if (req.file) {
            // Get old file path to delete later
            const oldFileResult = await client.query('SELECT file_path FROM materials WHERE id = $1', [materialId]);
            if (oldFileResult.rows.length > 0) {
                oldFilePath = oldFileResult.rows[0].file_path;
            }

            const file = req.file;
            const newRelativePath = path.join(getStoragePath(), file.filename);

            paramCount++;
            updates.push(`file_name = $${paramCount}`);
            values.push(file.originalname);

            paramCount++;
            updates.push(`file_path = $${paramCount}`);
            values.push(newRelativePath);

            paramCount++;
            updates.push(`file_size = $${paramCount}`);
            values.push(file.size);

            paramCount++;
            updates.push(`file_type = $${paramCount}`);
            values.push(file.mimetype);
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

        // Get file path before deleting, plus all version files
        const [materialResult, versionsResult] = await Promise.all([
            query('SELECT file_path FROM materials WHERE id = $1', [materialId]),
            query('SELECT file_path FROM material_versions WHERE material_id = $1', [materialId])
        ]);

        if (materialResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const filesToDelete = [
            materialResult.rows[0].file_path,
            ...versionsResult.rows.map(v => v.file_path)
        ];

        // Delete from database (cascades to permissions, tags, and versions)
        await query('DELETE FROM materials WHERE id = $1', [materialId]);

        // Delete all files from storage
        for (const filePath of filesToDelete) {
            if (filePath) {
                try {
                    await deleteFile(filePath);
                } catch (fileError) {
                    console.error(`Failed to delete file ${filePath} from storage:`, fileError);
                }
            }
        }

        res.json({
            success: true,
            message: 'Material and its versions deleted successfully'
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

/**
 * PUT /api/materials/:id/archive
 * Archive a material (soft delete)
 */
router.put('/:id/archive', authenticate, validateUUID(), requireEditPermission, async (req, res) => {
    try {
        const materialId = req.params.id;

        const existing = await query('SELECT id, is_archived FROM materials WHERE id = $1', [materialId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (existing.rows[0].is_archived) {
            return res.status(400).json({ success: false, message: 'Material is already archived' });
        }

        await query(
            'UPDATE materials SET is_archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [materialId]
        );

        res.json({ success: true, message: 'Material archived successfully' });
    } catch (error) {
        console.error('Archive material error:', error);
        res.status(500).json({ success: false, message: 'Failed to archive material' });
    }
});

/**
 * PUT /api/materials/:id/unarchive
 * Restore a material from the archive
 */
router.put('/:id/unarchive', authenticate, validateUUID(), requireEditPermission, async (req, res) => {
    try {
        const materialId = req.params.id;

        const existing = await query('SELECT id, is_archived FROM materials WHERE id = $1', [materialId]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (!existing.rows[0].is_archived) {
            return res.status(400).json({ success: false, message: 'Material is not archived' });
        }

        await query(
            'UPDATE materials SET is_archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [materialId]
        );

        res.json({ success: true, message: 'Material unarchived successfully' });
    } catch (error) {
        console.error('Unarchive material error:', error);
        res.status(500).json({ success: false, message: 'Failed to unarchive material' });
    }
});

module.exports = router;
