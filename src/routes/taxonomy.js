const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const {
    validateSubjectCreation,
    validateTopicCreation,
    validateGradeCreation
} = require('../middleware/validation');

/**
 * GET /api/taxonomy/subjects
 * Get all subjects with statistics
 */
router.get('/subjects', authenticate, async (req, res) => {
    try {
        const includeStats = req.query.stats === 'true';

        let queryText;
        if (includeStats) {
            queryText = `
                SELECT * FROM subject_statistics
                ORDER BY display_order, name
            `;
        } else {
            queryText = `
                SELECT id, name, code, description, icon, display_order
                FROM subjects
                WHERE is_active = TRUE
                ORDER BY display_order, name
            `;
        }

        const result = await query(queryText);

        res.json({
            success: true,
            data: {
                subjects: result.rows
            }
        });
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve subjects'
        });
    }
});

/**
 * GET /api/taxonomy/topics
 * Get topics, optionally filtered by subject
 */
router.get('/topics', authenticate, async (req, res) => {
    try {
        const subjectCode = req.query.subject;
        const includeStats = req.query.stats === 'true';
        const parentOnly = req.query.parentOnly === 'true';

        let queryText;
        let params = [];

        if (includeStats) {
            queryText = `
                SELECT * FROM topic_statistics
                WHERE 1=1
            `;

            if (subjectCode) {
                params.push(subjectCode);
                queryText += ` AND subject_name = (SELECT name FROM subjects WHERE code = $${params.length})`;
            }

            if (parentOnly) {
                queryText += ` AND id NOT IN (SELECT DISTINCT parent_topic_id FROM topics WHERE parent_topic_id IS NOT NULL)`;
            }

            queryText += ` ORDER BY subject_name, display_order, topic_name`;
        } else {
            queryText = `
                SELECT 
                    t.id,
                    t.name AS topic_name,
                    t.code AS topic_code,
                    t.description AS topic_description,
                    t.difficulty_level,
                    t.parent_topic_id,
                    s.id AS subject_id,
                    s.name AS subject_name,
                    s.code AS subject_code,
                    pt.name AS parent_topic_name,
                    -- Get subtopics (SQLite compatible)
                    COALESCE(
                        (SELECT json_group_array(json_object(
                            'id', st.id,
                            'name', st.name,
                            'code', st.code,
                            'difficulty_level', st.difficulty_level
                        ))
                        FROM topics st
                        WHERE st.parent_topic_id = t.id AND st.is_active = 1),
                        '[]'
                    ) AS subtopics
                FROM topics t
                JOIN subjects s ON t.subject_id = s.id
                LEFT JOIN topics pt ON t.parent_topic_id = pt.id
                WHERE t.is_active = 1
            `;

            if (subjectCode) {
                params.push(subjectCode);
                queryText += ` AND s.code = $${params.length}`;
            }

            if (parentOnly) {
                queryText += ` AND t.parent_topic_id IS NULL`;
            }

            queryText += ` ORDER BY s.display_order, t.display_order, t.name`;
        }

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: {
                topics: result.rows,
                filters: {
                    subject: subjectCode || 'all',
                    parentOnly
                }
            }
        });
    } catch (error) {
        console.error('Get topics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve topics'
        });
    }
});

/**
 * GET /api/taxonomy/grades
 * Get all grades, optionally filtered by category
 */
router.get('/grades', authenticate, async (req, res) => {
    try {
        const category = req.query.category; // K12, UNDERGRADUATE, GRADUATE

        let queryText = `
            SELECT id, name, code, level_order, category, description, age_range
            FROM grades
            WHERE is_active = TRUE
        `;

        const params = [];

        if (category) {
            params.push(category.toUpperCase());
            queryText += ` AND category = $1`;
        }

        queryText += ` ORDER BY level_order`;

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: {
                grades: result.rows,
                filter: {
                    category: category || 'all'
                }
            }
        });
    } catch (error) {
        console.error('Get grades error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve grades'
        });
    }
});

/**
 * POST /api/taxonomy/subjects
 * Create a new subject (admin only)
 */
router.post('/subjects', authenticate, requirePermission('materials:admin'), validateSubjectCreation, async (req, res) => {
    try {
        const { name, code, description, icon, displayOrder } = req.body;

        const result = await query(
            `INSERT INTO subjects (name, code, description, icon, display_order)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, code, description, icon, display_order, created_at`,
            [name, code.toUpperCase(), description || null, icon || null, displayOrder || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Subject created successfully',
            data: {
                subject: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Create subject error:', error);

        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
                success: false,
                message: 'Subject with this name or code already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create subject'
        });
    }
});

/**
 * POST /api/taxonomy/topics
 * Create a new topic (admin only)
 */
router.post('/topics', authenticate, requirePermission('materials:admin'), validateTopicCreation, async (req, res) => {
    try {
        const { subjectId, name, code, description, parentTopicId, difficultyLevel, displayOrder } = req.body;

        const result = await query(
            `INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, subject_id, name, code, description, parent_topic_id, difficulty_level, display_order, created_at`,
            [subjectId, name, code.toUpperCase(), description || null, parentTopicId || null, difficultyLevel || null, displayOrder || 0]
        );

        res.status(201).json({
            success: true,
            message: 'Topic created successfully',
            data: {
                topic: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Create topic error:', error);

        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
                success: false,
                message: 'Topic with this name or code already exists'
            });
        }

        if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            return res.status(400).json({
                success: false,
                message: 'Invalid subject ID or parent topic ID'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create topic'
        });
    }
});

/**
 * POST /api/taxonomy/grades
 * Create a new grade level (admin only)
 */
router.post('/grades', authenticate, requirePermission('materials:admin'), validateGradeCreation, async (req, res) => {
    try {
        const { name, code, levelOrder, category, description, ageRange } = req.body;

        const result = await query(
            `INSERT INTO grades (name, code, level_order, category, description, age_range)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, code, level_order, category, description, age_range, created_at`,
            [name, code.toUpperCase(), levelOrder, category.toUpperCase(), description || null, ageRange || null]
        );

        res.status(201).json({
            success: true,
            message: 'Grade created successfully',
            data: {
                grade: result.rows[0]
            }
        });
    } catch (error) {
        console.error('Create grade error:', error);

        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
                success: false,
                message: 'Grade with this name, code, or level order already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create grade'
        });
    }
});

/**
 * GET /api/taxonomy/hierarchy
 * Get complete taxonomy hierarchy
 */
router.get('/hierarchy', authenticate, async (req, res) => {
    try {
        // Get subjects
        const subjectsResult = await query(`
            SELECT id, name, code, description, icon
            FROM subjects
            WHERE is_active = 1
            ORDER BY display_order, name
        `);

        // Get topics grouped by subject
        const topicsResult = await query(`
            SELECT 
                t.id,
                t.name,
                t.code,
                t.difficulty_level,
                t.parent_topic_id,
                t.subject_id
            FROM topics t
            WHERE t.is_active = 1
            ORDER BY t.display_order, t.name
        `);

        // Build subjects with topics array
        const subjects = subjectsResult.rows.map(subject => ({
            ...subject,
            topics: topicsResult.rows.filter(t => t.subject_id === subject.id)
        }));

        // Get grades grouped by category
        const gradesResult = await query(`
            SELECT id, name, code, level_order, category
            FROM grades
            WHERE is_active = 1
            ORDER BY level_order
        `);

        // Group grades by category
        const gradeCategories = [];
        const categoryMap = new Map();
        for (const grade of gradesResult.rows) {
            if (!categoryMap.has(grade.category)) {
                categoryMap.set(grade.category, []);
            }
            categoryMap.get(grade.category).push({
                id: grade.id,
                name: grade.name,
                code: grade.code,
                level_order: grade.level_order
            });
        }
        for (const [category, grades] of categoryMap) {
            gradeCategories.push({ category, grades });
        }

        res.json({
            success: true,
            data: {
                subjects,
                gradeCategories
            }
        });
    } catch (error) {
        console.error('Get hierarchy error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve taxonomy hierarchy'
        });
    }
});

/**
 * DELETE /api/taxonomy/subjects/:id
 * Delete a subject (admin only) - soft delete by setting is_active = false
 */
router.delete('/subjects/:id', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if subject exists
        const existing = await query('SELECT id, name FROM subjects WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Subject not found'
            });
        }

        // Soft delete
        await query('UPDATE subjects SET is_active = 0 WHERE id = $1', [id]);

        res.json({
            success: true,
            message: `Subject "${existing.rows[0].name}" deleted successfully`
        });
    } catch (error) {
        console.error('Delete subject error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete subject'
        });
    }
});

/**
 * DELETE /api/taxonomy/topics/:id
 * Delete a topic (admin only) - soft delete
 */
router.delete('/topics/:id', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await query('SELECT id, name FROM topics WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Topic not found'
            });
        }

        await query('UPDATE topics SET is_active = 0 WHERE id = $1', [id]);

        res.json({
            success: true,
            message: `Topic "${existing.rows[0].name}" deleted successfully`
        });
    } catch (error) {
        console.error('Delete topic error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete topic'
        });
    }
});

/**
 * DELETE /api/taxonomy/grades/:id
 * Delete a grade (admin only) - soft delete
 */
router.delete('/grades/:id', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await query('SELECT id, name FROM grades WHERE id = $1', [id]);
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Grade not found' });
        }
        await query('UPDATE grades SET is_active = 0 WHERE id = $1', [id]);
        res.json({ success: true, message: `Grade "${existing.rows[0].name}" deleted successfully` });
    } catch (error) {
        console.error('Delete grade error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete grade' });
    }
});

/**
 * GET /api/taxonomy/grades/:id/classes
 * Get all classes (e.g. 9-a, 9-b) for a grade
 */
router.get('/grades/:id/classes', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT id, grade_id, name, created_at
             FROM grade_classes
             WHERE grade_id = $1 AND is_active = 1
             ORDER BY name`,
            [id]
        );
        res.json({ success: true, data: { classes: result.rows } });
    } catch (error) {
        console.error('Get grade classes error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve grade classes' });
    }
});

/**
 * POST /api/taxonomy/grades/:id/classes
 * Create a new class for a grade (admin only)
 */
router.post('/grades/:id/classes', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Class name is required' });
        }
        const result = await query(
            `INSERT INTO grade_classes (grade_id, name)
             VALUES ($1, $2)
             RETURNING id, grade_id, name, created_at`,
            [id, name.trim()]
        );
        res.status(201).json({ success: true, data: { class: result.rows[0] } });
    } catch (error) {
        console.error('Create grade class error:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ success: false, message: 'A class with that name already exists for this grade' });
        }
        res.status(500).json({ success: false, message: 'Failed to create grade class' });
    }
});

/**
 * DELETE /api/taxonomy/grades/:gradeId/classes/:classId
 * Delete a grade class (admin only)
 */
router.delete('/grades/:gradeId/classes/:classId', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { gradeId, classId } = req.params;
        const existing = await query(
            `SELECT id, name FROM grade_classes WHERE id = $1 AND grade_id = $2`,
            [classId, gradeId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }
        await query(`UPDATE grade_classes SET is_active = 0 WHERE id = $1`, [classId]);
        res.json({ success: true, message: `Class "${existing.rows[0].name}" deleted` });
    } catch (error) {
        console.error('Delete grade class error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete grade class' });
    }
});

module.exports = router;

