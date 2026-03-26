const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validatePagination } = require('../middleware/validation');
const {
    getHybridRecommendations,
    getTrendingMaterials,
    getPopularMaterials,
    getSimilarMaterials
} = require('../utils/recommendations');
const { updateUserPreferences } = require('../utils/activityTracker');

/**
 * GET /api/recommendations
 * Get general recommendations (trending materials by default)
 */
router.get('/', validatePagination, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '10');
        const trending = await getTrendingMaterials(limit, {});

        res.json({
            success: true,
            data: {
                recommendations: trending,
                count: trending.length,
                type: 'trending'
            }
        });
    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recommendations'
        });
    }
});

/**
 * GET /api/recommendations/personalized
 * Get personalized recommendations for the authenticated user
 */
router.get('/personalized', authenticate, validatePagination, async (req, res) => {
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit || '10');

        // Update user preferences before generating recommendations
        await updateUserPreferences(userId);

        const recommendations = await getHybridRecommendations(userId, limit);

        res.json({
            success: true,
            data: {
                recommendations,
                count: recommendations.length
            }
        });
    } catch (error) {
        console.error('Get personalized recommendations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recommendations'
        });
    }
});

/**
 * GET /api/recommendations/trending
 * Get currently trending materials
 */
router.get('/trending', validatePagination, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '10');
        const filters = {};

        if (req.query.subjectId) {
            filters.subjectId = parseInt(req.query.subjectId);
        }

        if (req.query.gradeId) {
            filters.gradeId = parseInt(req.query.gradeId);
        }

        const trending = await getTrendingMaterials(limit, filters);

        res.json({
            success: true,
            data: {
                trending,
                count: trending.length
            }
        });
    } catch (error) {
        console.error('Get trending materials error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get trending materials'
        });
    }
});

/**
 * GET /api/recommendations/trending-for-me
 * Role-aware trending:
 *  - student → most downloaded materials from their assigned class
 *  - teacher → most downloaded materials they uploaded
 *  - admin/other → global trending
 */
router.get('/trending-for-me', authenticate, async (req, res) => {
    try {
        const { query } = require('../config/database');
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit || '5');

        // Determine the user's primary role
        const rolesResult = await query(
            `SELECT r.name FROM roles r
             JOIN user_roles ur ON r.id = ur.role_id
             WHERE ur.user_id = $1`,
            [userId]
        );
        const roleNames = rolesResult.rows.map(r => r.name);

        let rows = [];

        if (roleNames.includes('student')) {
            // Find the student's class enrollment(s)
            const classResult = await query(
                `SELECT class_id FROM student_class_enrollments WHERE student_id = $1 LIMIT 1`,
                [userId]
            );

            if (classResult.rows.length > 0) {
                const classId = classResult.rows[0].class_id;
                // Most downloaded materials in that class OR general public materials
                const result = await query(
                    `SELECT m.id, m.title, m.description, m.file_type, m.download_count
                     FROM materials m
                     LEFT JOIN material_grade_classes mgc ON mgc.material_id = m.id
                     WHERE (mgc.class_id = $1 OR (m.is_public = 1 AND mgc.class_id IS NULL))
                     AND m.is_archived = 0
                     ORDER BY m.download_count DESC
                     LIMIT $2`,
                    [classId, limit]
                );
                rows = result.rows;
            }

            // Fallback to global if no class or no materials
            if (rows.length === 0) {
                const fallback = await query(
                    `SELECT id, title, description, file_type, download_count
                     FROM materials WHERE is_archived = 0
                     ORDER BY download_count DESC LIMIT $1`,
                    [limit]
                );
                rows = fallback.rows;
            }

        } else if (roleNames.includes('teacher')) {
            // Most downloaded materials uploaded by this teacher
            const result = await query(
                `SELECT m.id, m.title, m.description, m.file_type, m.download_count
                 FROM materials m
                 WHERE m.uploaded_by = $1
                 AND m.is_archived = 0
                 ORDER BY m.download_count DESC
                 LIMIT $2`,
                [userId, limit]
            );
            rows = result.rows;

        } else {
            // Admin or other: global trending
            const result = await query(
                `SELECT id, title, description, file_type, download_count
                 FROM materials WHERE is_archived = 0
                 ORDER BY download_count DESC LIMIT $1`,
                [limit]
            );
            rows = result.rows;
        }

        const trending = rows.map(row => ({
            materialId: row.id,
            title: row.title,
            description: row.description,
            fileType: row.file_type,
            downloadCount: row.download_count,
            download_count: row.download_count
        }));

        res.json({ success: true, data: { trending, count: trending.length } });
    } catch (error) {
        console.error('Get trending-for-me error:', error);
        res.status(500).json({ success: false, message: 'Failed to get trending materials' });
    }
});

/**
 * GET /api/recommendations/popular
 * Get all-time popular materials
 */
router.get('/popular', validatePagination, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '10');
        const filters = {};

        if (req.query.subjectId) {
            filters.subjectId = parseInt(req.query.subjectId);
        }

        if (req.query.topicId) {
            filters.topicId = parseInt(req.query.topicId);
        }

        const popular = await getPopularMaterials(limit, filters);

        res.json({
            success: true,
            data: {
                popular,
                count: popular.length
            }
        });
    } catch (error) {
        console.error('Get popular materials error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get popular materials'
        });
    }
});

/**
 * GET /api/recommendations/similar/:materialId
 * Get materials similar to a specific material
 */
router.get('/similar/:materialId', async (req, res) => {
    try {
        const materialId = parseInt(req.params.materialId);
        const limit = parseInt(req.query.limit || '5');

        if (isNaN(materialId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid material ID'
            });
        }

        const similar = await getSimilarMaterials(materialId, limit);

        res.json({
            success: true,
            data: {
                similar,
                count: similar.length
            }
        });
    } catch (error) {
        console.error('Get similar materials error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get similar materials'
        });
    }
});

/**
 * GET /api/recommendations/for-you
 * Contextual recommendations based on current context
 * This combines trending + personalized based on context
 */
router.get('/for-you', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const contextType = req.query.contextType; // 'subject', 'topic', 'grade'
        const contextId = req.query.contextId ? parseInt(req.query.contextId) : null;
        const limit = parseInt(req.query.limit || '10');

        let filters = {};

        // Apply context filters
        if (contextType === 'subject' && contextId) {
            filters.subjectId = contextId;
        } else if (contextType === 'grade' && contextId) {
            filters.gradeId = contextId;
        } else if (contextType === 'topic' && contextId) {
            filters.topicId = contextId;
        }

        // Get both personalized and trending for the context
        const [personalized, trending] = await Promise.all([
            getHybridRecommendations(userId, Math.ceil(limit / 2)),
            getTrendingMaterials(Math.ceil(limit / 2), filters)
        ]);

        // Combine results with diversity
        const combinedResults = [];
        const seenIds = new Set();

        // Interleave personalized and trending
        const maxLength = Math.max(personalized.length, trending.length);
        for (let i = 0; i < maxLength && combinedResults.length < limit; i++) {
            if (i < personalized.length && !seenIds.has(personalized[i].materialId)) {
                combinedResults.push({
                    ...personalized[i],
                    source: 'personalized'
                });
                seenIds.add(personalized[i].materialId);
            }

            if (i < trending.length && !seenIds.has(trending[i].materialId)) {
                combinedResults.push({
                    ...trending[i],
                    source: 'trending'
                });
                seenIds.add(trending[i].materialId);
            }
        }

        res.json({
            success: true,
            data: {
                recommendations: combinedResults.slice(0, limit),
                count: combinedResults.slice(0, limit).length,
                context: {
                    type: contextType,
                    id: contextId
                }
            }
        });
    } catch (error) {
        console.error('Get for-you recommendations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get contextual recommendations'
        });
    }
});

/**
 * GET /api/recommendations/top-rated
 * Get the highest-rated materials (for bar chart widget)
 */
router.get('/top-rated', async (req, res) => {
    try {
        const { query } = require('../config/database');
        const limit = parseInt(req.query.limit || '5');

        const result = await query(
            `SELECT m.id, m.title, m.average_rating, m.rating_count
             FROM materials m
             WHERE m.average_rating > 0
             AND (m.is_archived = 0 OR m.is_archived IS NULL)
             ORDER BY m.average_rating DESC, m.rating_count DESC
             LIMIT $1`,
            [limit]
        );

        res.json({
            success: true,
            data: {
                materials: result.rows.map(r => ({
                    id: r.id,
                    title: r.title,
                    averageRating: parseFloat(r.average_rating) || 0,
                    ratingCount: r.rating_count || 0
                }))
            }
        });
    } catch (error) {
        console.error('Get top-rated error:', error);
        res.status(500).json({ success: false, message: 'Failed to get top-rated materials' });
    }
});

module.exports = router;
