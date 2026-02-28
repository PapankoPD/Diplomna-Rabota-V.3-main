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

module.exports = router;
