const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

/**
 * GET /api/classes
 * Get all grades with their classes and assigned teachers
 */
router.get('/', authenticate, async (req, res) => {
    try {
        // Get all grades with their classes
        const gradesRes = await query(`
            SELECT id, name, code, category, level_order
            FROM grades WHERE is_active = 1 ORDER BY level_order
        `);

        const grades = gradesRes.rows;

        for (const grade of grades) {
            // Get classes for this grade
            const classesRes = await query(`
                SELECT gc.id, gc.name,
                    u.id AS teacher_id,
                    u.username AS teacher_username,
                    u.email AS teacher_email
                FROM grade_classes gc
                LEFT JOIN teacher_class_assignments tca ON gc.id = tca.class_id
                LEFT JOIN users u ON tca.teacher_id = u.id
                WHERE gc.grade_id = $1 AND gc.is_active = 1
                ORDER BY gc.name
            `, [grade.id]);

            grade.classes = classesRes.rows.map(c => ({
                id: c.id,
                name: c.name,
                teacher: c.teacher_id ? {
                    id: c.teacher_id,
                    username: c.teacher_username,
                    email: c.teacher_email
                } : null
            }));
        }

        res.json({ success: true, data: { grades } });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve classes' });
    }
});

/**
 * GET /api/classes/teachers
 * Get all users with teacher role and their current class count
 */
router.get('/teachers', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const result = await query(`
            SELECT u.id, u.username, u.email,
                COUNT(tca.class_id) AS class_count
            FROM users u
            LEFT JOIN teacher_class_assignments tca ON u.id = tca.teacher_id
            GROUP BY u.id, u.username, u.email
            ORDER BY u.username
        `);
        res.json({ success: true, data: { teachers: result.rows } });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve teachers' });
    }
});

/**
 * POST /api/classes/:classId/assign
 * Assign a teacher to a class (admin only, max 4 classes per teacher)
 */
router.post('/:classId/assign', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { classId } = req.params;
        const { teacherId } = req.body;

        if (!teacherId) {
            return res.status(400).json({ success: false, message: 'teacherId is required' });
        }

        // Check teacher's current class count
        const countRes = await query(
            `SELECT COUNT(*) AS count FROM teacher_class_assignments WHERE teacher_id = $1`,
            [teacherId]
        );
        const currentCount = parseInt(countRes.rows[0]?.count || 0);
        if (currentCount >= 4) {
            return res.status(400).json({
                success: false,
                message: 'This teacher is already assigned to the maximum of 4 classes'
            });
        }

        // Remove any existing teacher from this class first
        await query(`DELETE FROM teacher_class_assignments WHERE class_id = $1`, [classId]);

        // Assign new teacher
        await query(
            `INSERT INTO teacher_class_assignments (teacher_id, class_id) VALUES ($1, $2)`,
            [teacherId, classId]
        );

        res.json({ success: true, message: 'Teacher assigned successfully' });
    } catch (error) {
        console.error('Assign teacher error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign teacher' });
    }
});

/**
 * DELETE /api/classes/:classId/assign
 * Remove teacher assignment from a class (admin only)
 */
router.delete('/:classId/assign', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { classId } = req.params;
        await query(`DELETE FROM teacher_class_assignments WHERE class_id = $1`, [classId]);
        res.json({ success: true, message: 'Teacher removed from class' });
    } catch (error) {
        console.error('Remove teacher error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove teacher assignment' });
    }
});

module.exports = router;
