/**
 * Search Routes
 * Provides API endpoints for full-text search across the platform
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const {
    searchMaterials,
    countSearchResults,
    searchTopics,
    searchSubjects,
    globalSearch,
    listMaterials,
    countMaterials,
    getAutocompleteSuggestions
} = require('../utils/search');

/**
 * GET /api/search
 * Global search across materials, topics, and subjects
 */
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const results = await globalSearch(q, { limit: parseInt(limit) });

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

/**
 * GET /api/search/materials
 * Search materials with filtering and pagination
 */
router.get('/materials', optionalAuth, async (req, res) => {
    try {
        const {
            q,
            page = 1,
            limit = 20,
            categoryId,
            subjectId,
            gradeId,
            fileType,
            isPublic,
            sortBy = 'relevance',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const options = {
            limit: limitNum,
            offset,
            categoryId: categoryId ? parseInt(categoryId) : null,
            subjectId: subjectId ? parseInt(subjectId) : null,
            gradeId: gradeId ? parseInt(gradeId) : null,
            fileType: fileType || null,
            isPublic: isPublic !== undefined ? isPublic === 'true' : null,
            sortBy,
            sortOrder
        };

        let materials, total;

        if (q && q.trim().length > 0) {
            // Full-text search
            materials = await searchMaterials(q, options);
            total = await countSearchResults(q, options);

            // Track search activity (async, only if authenticated)
            if (req.user) {
                const { trackSearch } = require('../utils/activityTracker');
                const filters = { categoryId, subjectId, gradeId, fileType };
                trackSearch(req.user.userId, q, filters).catch(err =>
                    console.error('Failed to track search:', err)
                );
            }
        } else {
            // List with filters only
            materials = await listMaterials(options);
            total = await countMaterials(options);
        }

        res.json({
            success: true,
            data: {
                materials,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                },
                query: q || null
            }
        });
    } catch (error) {
        console.error('Materials search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

/**
 * GET /api/search/topics
 * Search topics with filtering
 */
router.get('/topics', optionalAuth, async (req, res) => {
    try {
        const {
            q,
            page = 1,
            limit = 20,
            subjectId,
            difficulty
        } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const topics = await searchTopics(q, {
            limit: limitNum,
            offset,
            subjectId: subjectId ? parseInt(subjectId) : null,
            difficulty: difficulty ? parseInt(difficulty) : null
        });

        res.json({
            success: true,
            data: {
                topics,
                query: q
            }
        });
    } catch (error) {
        console.error('Topics search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

/**
 * GET /api/search/subjects
 * Search subjects
 */
router.get('/subjects', optionalAuth, async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const subjects = await searchSubjects(q, { limit: parseInt(limit) });

        res.json({
            success: true,
            data: {
                subjects,
                query: q
            }
        });
    } catch (error) {
        console.error('Subjects search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

/**
 * GET /api/search/autocomplete
 * Get autocomplete suggestions
 */
router.get('/autocomplete', optionalAuth, async (req, res) => {
    try {
        const { q, limit = 5 } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                data: { suggestions: [] }
            });
        }

        const suggestions = await getAutocompleteSuggestions(q, parseInt(limit));

        res.json({
            success: true,
            data: { suggestions }
        });
    } catch (error) {
        console.error('Autocomplete error:', error);
        res.status(500).json({
            success: false,
            message: 'Autocomplete failed'
        });
    }
});

module.exports = router;
