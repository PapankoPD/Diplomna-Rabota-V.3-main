const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

/**
 * GET /api/classes
 * - Admin: all grades + classes
 * - Teacher: only classes assigned to this teacher
 * - Student: only their enrolled class (with classmates list)
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Detect role
        const rolesRes = await query(
            `SELECT r.name FROM roles r
             INNER JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1`,
            [userId]
        );
        const roleNames = rolesRes.rows.map(r => r.name);
        const isAdmin = roleNames.includes('admin');
        const isTeacher = roleNames.includes('teacher');
        const isStudent = !isAdmin && !isTeacher;

        // ── STUDENT branch ────────────────────────────────────────────────────
        if (isStudent) {
            const enrollRes = await query(
                `SELECT sce.class_id,
                        gc.name  AS class_name,
                        gc.grade_id,
                        g.name   AS grade_name,
                        g.code   AS grade_code,
                        g.category,
                        g.level_order,
                        u.id     AS teacher_id,
                        u.username AS teacher_username,
                        u.email    AS teacher_email
                 FROM student_class_enrollments sce
                 JOIN grade_classes gc ON sce.class_id = gc.id
                 JOIN grades g ON gc.grade_id = g.id
                 LEFT JOIN teacher_class_assignments tca ON gc.id = tca.class_id
                 LEFT JOIN users u ON tca.teacher_id = u.id
                 WHERE sce.student_id = $1 AND gc.is_active = 1 AND g.is_active = 1`,
                [userId]
            );

            if (enrollRes.rows.length === 0) {
                // Not yet assigned to any class
                return res.json({ success: true, data: { grades: [], isStudent: true } });
            }

            const row = enrollRes.rows[0];

            // Fetch all classmates enrolled in the same class
            const classmatesRes = await query(
                `SELECT u.id, u.username
                 FROM student_class_enrollments sce
                 JOIN users u ON sce.student_id = u.id
                 WHERE sce.class_id = $1
                 ORDER BY u.username`,
                [row.class_id]
            );

            const grades = [{
                id: row.grade_id,
                name: row.grade_name,
                code: row.grade_code,
                category: row.category,
                level_order: row.level_order,
                classes: [{
                    id: row.class_id,
                    name: row.class_name,
                    teacher: row.teacher_id ? {
                        id: row.teacher_id,
                        username: row.teacher_username,
                        email: row.teacher_email,
                    } : null,
                    students: classmatesRes.rows,
                }]
            }];

            return res.json({ success: true, data: { grades, isStudent: true } });
        }

        // ── TEACHER branch ────────────────────────────────────────────────────
        if (isTeacher && !isAdmin) {
            const assignedRes = await query(`
                SELECT DISTINCT
                    g.id AS grade_id, g.name AS grade_name, g.code AS grade_code,
                    g.category, g.level_order,
                    gc.id AS class_id, gc.name AS class_name
                FROM teacher_class_assignments tca
                JOIN grade_classes gc ON tca.class_id = gc.id
                JOIN grades g ON gc.grade_id = g.id
                WHERE tca.teacher_id = $1 AND gc.is_active = 1 AND g.is_active = 1
                ORDER BY g.level_order, gc.name
            `, [userId]);

            const gradeMap = {};
            for (const row of assignedRes.rows) {
                if (!gradeMap[row.grade_id]) {
                    gradeMap[row.grade_id] = {
                        id: row.grade_id,
                        name: row.grade_name,
                        code: row.grade_code,
                        category: row.category,
                        level_order: row.level_order,
                        classes: []
                    };
                }
                gradeMap[row.grade_id].classes.push({
                    id: row.class_id,
                    name: row.class_name,
                    teacher: { id: userId }
                });
            }
            const grades = Object.values(gradeMap);
            return res.json({ success: true, data: { grades, isTeacher: true } });
        }

        // ── ADMIN branch ──────────────────────────────────────────────────────
        const gradesRes = await query(`
            SELECT id, name, code, category, level_order
            FROM grades WHERE is_active = 1 ORDER BY level_order
        `);
        const grades = gradesRes.rows;

        for (const grade of grades) {
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

        return res.json({ success: true, data: { grades, isTeacher: false, isAdmin: true } });

    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve classes' });
    }
});

/**
 * GET /api/classes/:classId/students
 * Return all students enrolled in a class
 */
router.get('/:classId/students', authenticate, async (req, res) => {
    try {
        const { classId } = req.params;
        const result = await query(
            `SELECT u.id, u.username, u.email, sce.enrolled_at
             FROM student_class_enrollments sce
             JOIN users u ON sce.student_id = u.id
             WHERE sce.class_id = $1
             ORDER BY u.username`,
            [classId]
        );
        res.json({ success: true, data: { students: result.rows } });
    } catch (error) {
        console.error('Get class students error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve students' });
    }
});

/**
 * GET /api/classes/:classId/materials
 * Get materials uploaded for a specific grade class
 */
router.get('/:classId/materials', authenticate, async (req, res) => {
    try {
        const { classId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const classRes = await query(
            `SELECT gc.id, gc.name, g.name AS grade_name
             FROM grade_classes gc
             JOIN grades g ON gc.grade_id = g.id
             WHERE gc.id = $1 AND gc.is_active = 1`,
            [classId]
        );

        if (classRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        const classInfo = classRes.rows[0];

        const materialsRes = await query(`
            SELECT m.id, m.title, m.description, m.file_name AS original_filename,
                m.file_type, m.file_size, m.created_at, m.download_count,
                u.username AS uploader_username
            FROM materials m
            JOIN material_grade_classes mgc ON m.id = mgc.material_id
            JOIN users u ON m.uploaded_by = u.id
            WHERE mgc.class_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2 OFFSET $3
        `, [classId, limit, offset]);

        const countRes = await query(
            `SELECT COUNT(*) AS total FROM material_grade_classes WHERE class_id = $1`,
            [classId]
        );

        const total = parseInt(countRes.rows[0]?.total || 0);

        res.json({
            success: true,
            data: {
                classInfo,
                materials: materialsRes.rows,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            }
        });
    } catch (error) {
        console.error('Get class materials error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve class materials' });
    }
});

/**
 * GET /api/classes/teachers
 * Get all users with teacher role and their current class count (admin only)
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

        await query(`DELETE FROM teacher_class_assignments WHERE class_id = $1`, [classId]);
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

/**
 * POST /api/classes/:classId/enroll
 * Enroll a student in a class (admin only). Replaces any existing enrollment.
 */
router.post('/:classId/enroll', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { classId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId is required' });
        }

        // Verify class exists
        const classRes = await query(
            `SELECT id FROM grade_classes WHERE id = $1 AND is_active = 1`,
            [classId]
        );
        if (classRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        // INSERT OR REPLACE respects the UNIQUE(student_id) constraint → moves student if already enrolled
        await query(
            `INSERT OR REPLACE INTO student_class_enrollments (student_id, class_id) VALUES ($1, $2)`,
            [userId, classId]
        );

        res.json({ success: true, message: 'Student enrolled successfully' });
    } catch (error) {
        console.error('Enroll student error:', error);
        res.status(500).json({ success: false, message: 'Failed to enroll student' });
    }
});

/**
 * DELETE /api/classes/:classId/enroll/:userId
 * Remove a student from a class (admin only)
 */
router.delete('/:classId/enroll/:userId', authenticate, requirePermission('materials:admin'), async (req, res) => {
    try {
        const { classId, userId } = req.params;
        await query(
            `DELETE FROM student_class_enrollments WHERE class_id = $1 AND student_id = $2`,
            [classId, userId]
        );
        res.json({ success: true, message: 'Student removed from class' });
    } catch (error) {
        console.error('Unenroll student error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove student from class' });
    }
});

module.exports = router;
