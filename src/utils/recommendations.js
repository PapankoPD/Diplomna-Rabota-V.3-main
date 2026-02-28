/**
 * Recommendation Engine - Core algorithms for personalized material recommendations
 */

const { query } = require('../config/database');
const { getUserPreferences } = require('./activityTracker');
const cache = require('./cache');

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number} Similarity score (0 to 1)
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get collaborative filtering recommendations
 * Find similar users and recommend materials they liked
 * @param {number} userId 
 * @param {number} limit 
 * @returns {Array} Recommended materials with scores
 */
async function getCollaborativeRecommendations(userId, limit = 10) {
    try {
        // Get all users and their interaction vectors
        const usersResult = await query(
            `SELECT user_id, material_id, interaction_score
             FROM user_material_interactions
             ORDER BY user_id, material_id`
        );

        if (usersResult.rows.length === 0) {
            return [];
        }

        // Build user-material matrix
        const userMaterials = {};
        const allMaterialIds = new Set();

        usersResult.rows.forEach(row => {
            if (!userMaterials[row.user_id]) {
                userMaterials[row.user_id] = {};
            }
            userMaterials[row.user_id][row.material_id] = row.interaction_score;
            allMaterialIds.add(row.material_id);
        });

        const materialIdsList = Array.from(allMaterialIds).sort((a, b) => a - b);

        // Convert to vectors
        const userVectors = {};
        Object.keys(userMaterials).forEach(uid => {
            userVectors[uid] = materialIdsList.map(mid => userMaterials[uid][mid] || 0);
        });

        if (!userVectors[userId]) {
            return []; // User has no interactions yet
        }

        // Find similar users
        const targetVector = userVectors[userId];
        const similarities = [];

        Object.keys(userVectors).forEach(otherUserId => {
            if (parseInt(otherUserId) === userId) return;

            const similarity = cosineSimilarity(targetVector, userVectors[otherUserId]);
            if (similarity > 0.1) { // Only consider users with some similarity
                similarities.push({
                    userId: parseInt(otherUserId),
                    similarity
                });
            }
        });

        // Sort by similarity
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topSimilarUsers = similarities.slice(0, 10); // Top 10 similar users

        if (topSimilarUsers.length === 0) {
            return [];
        }

        // Get materials liked by similar users that target user hasn't interacted with
        const similarUserIds = topSimilarUsers.map(u => u.userId);
        const candidateMaterials = await query(
            `SELECT 
                umi.material_id,
                m.title,
                m.description,
                m.file_type,
                SUM(umi.interaction_score) AS total_score,
                COUNT(DISTINCT umi.user_id) AS num_similar_users
             FROM user_material_interactions umi
             JOIN materials m ON umi.material_id = m.id
             WHERE umi.user_id IN (${similarUserIds.join(',')})
             AND umi.material_id NOT IN (
                 SELECT material_id FROM user_material_interactions WHERE user_id = $1
             )
             AND m.is_public = 1
             GROUP BY umi.material_id, m.title, m.description, m.file_type
             ORDER BY total_score DESC, num_similar_users DESC
             LIMIT $2`,
            [userId, limit]
        );

        return candidateMaterials.rows.map(row => ({
            materialId: row.material_id,
            title: row.title,
            description: row.description,
            fileType: row.file_type,
            score: row.total_score,
            reason: 'collaborative_filtering',
            numSimilarUsers: row.num_similar_users
        }));

    } catch (error) {
        console.error('Error in collaborative filtering:', error);
        return [];
    }
}

/**
 * Get content-based recommendations
 * Recommend materials similar to user's preferences
 * @param {number} userId 
 * @param {number} limit 
 * @returns {Array} Recommended materials with scores
 */
async function getContentBasedRecommendations(userId, limit = 10) {
    try {
        const prefs = await getUserPreferences(userId);

        if (!prefs || (prefs.subjects.length === 0 && prefs.topics.length === 0)) {
            return []; // No preferences yet
        }

        // Build scoring criteria based on preferences
        const topSubjects = prefs.subjects.slice(0, 3).map(s => s.id);
        const topTopics = prefs.topics.slice(0, 5).map(t => t.id);
        const topFileTypes = prefs.fileTypes.slice(0, 3).map(f => f.type);
        const topGrades = prefs.gradeLevels.slice(0, 3).map(g => g.id);

        // Find materials matching preferences that user hasn't seen
        let whereConditions = [];
        let params = [userId];
        let paramCount = 1;

        if (topSubjects.length > 0) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_subjects ms 
                WHERE ms.material_id = m.id 
                AND ms.subject_id IN (${topSubjects.join(',')})
            )`);
        }

        if (topTopics.length > 0) {
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_topics mt 
                WHERE mt.material_id = m.id 
                AND mt.topic_id IN (${topTopics.join(',')})
            )`);
        }

        const whereClause = whereConditions.length > 0 ?
            ' AND (' + whereConditions.join(' OR ') + ')' : '';

        const candidatesResult = await query(
            `SELECT DISTINCT
                m.id,
                m.title,
                m.description,
                m.file_type,
                m.download_count,
                -- Calculate preference match score
                (
                    -- Subject match (up to 3 points)
                    (SELECT COUNT(*) FROM material_subjects ms 
                     WHERE ms.material_id = m.id AND ms.subject_id IN (${topSubjects.join(',') || 0})) * 1.0 +
                    -- Topic match (up to 5 points)
                    (SELECT COUNT(*) FROM material_topics mt 
                     WHERE mt.material_id = m.id AND mt.topic_id IN (${topTopics.join(',') || 0})) * 1.5 +
                    -- Download popularity boost (up to 2 points)
                    LEAST(m.download_count / 10.0, 2.0)
                ) AS preference_score
             FROM materials m
             WHERE m.id NOT IN (
                 SELECT material_id FROM user_material_interactions WHERE user_id = $1
             )
             AND m.is_public = 1
             ${whereClause}
             ORDER BY preference_score DESC
             LIMIT $${paramCount + 1}`,
            [userId, limit]
        );

        return candidatesResult.rows.map(row => ({
            materialId: row.id,
            title: row.title,
            description: row.description,
            fileType: row.file_type,
            score: row.preference_score,
            reason: 'content_based'
        }));

    } catch (error) {
        console.error('Error in content-based recommendations:', error);
        return [];
    }
}

/**
 * Get hybrid recommendations (collaborative + content-based)
 * @param {number} userId 
 * @param {number} limit 
 * @returns {Array} Recommended materials with combined scores
 */
async function getHybridRecommendations(userId, limit = 10) {
    const cacheKey = `recommendations:user:${userId}:${limit}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('Cache hit for user recommendations:', userId);
        return cached;
    }

    try {
        // Get both types of recommendations
        const [collaborative, contentBased] = await Promise.all([
            getCollaborativeRecommendations(userId, limit),
            getContentBasedRecommendations(userId, limit)
        ]);

        // Combine and normalize scores
        const combinedScores = new Map();

        // Weight: 60% collaborative, 40% content-based
        const COLLAB_WEIGHT = 0.6;
        const CONTENT_WEIGHT = 0.4;

        collaborative.forEach((item, index) => {
            const normalizedScore = (collaborative.length - index) / collaborative.length;
            combinedScores.set(item.materialId, {
                ...item,
                score: normalizedScore * COLLAB_WEIGHT,
                reasons: ['collaborative_filtering']
            });
        });

        contentBased.forEach((item, index) => {
            const normalizedScore = (contentBased.length - index) / contentBased.length;
            const existing = combinedScores.get(item.materialId);

            if (existing) {
                existing.score += normalizedScore * CONTENT_WEIGHT;
                existing.reasons.push('content_based');
            } else {
                combinedScores.set(item.materialId, {
                    ...item,
                    score: normalizedScore * CONTENT_WEIGHT,
                    reasons: ['content_based']
                });
            }
        });

        // Sort by combined score and return top N
        const recommendations = Array.from(combinedScores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        // Cache for 30 minutes
        cache.set(cacheKey, recommendations, 1800000);

        return recommendations;

    } catch (error) {
        console.error('Error in hybrid recommendations:', error);
        return [];
    }
}

/**
 * Get trending materials (most active in last 7 days)
 * @param {number} limit 
 * @param {object} filters - Optional filters (subjectId, gradeId)
 * @returns {Array} Trending materials
 */
async function getTrendingMaterials(limit = 10, filters = {}) {
    const cacheKey = `trending:${JSON.stringify(filters)}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (filters.subjectId) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_subjects ms 
                WHERE ms.material_id = m.id AND ms.subject_id = $${paramCount}
            )`);
            params.push(filters.subjectId);
        }

        if (filters.gradeId) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_grades mg 
                WHERE mg.material_id = m.id AND mg.grade_id = $${paramCount}
            )`);
            params.push(filters.gradeId);
        }

        const whereClause = whereConditions.length > 0 ?
            ' AND ' + whereConditions.join(' AND ') : '';

        params.push(limit);

        const result = await query(
            `SELECT 
                m.id,
                m.title,
                m.description,
                m.file_type,
                COUNT(DISTINCT ua.user_id) AS unique_users,
                COUNT(*) AS total_interactions,
                SUM(CASE WHEN ua.activity_type = 'view' THEN 1 ELSE 0 END) AS view_count,
                SUM(CASE WHEN ua.activity_type = 'download' THEN 1 ELSE 0 END) AS download_count,
                (SUM(CASE WHEN ua.activity_type = 'view' THEN 1 ELSE 0 END) * 1.0 +
                 SUM(CASE WHEN ua.activity_type = 'download' THEN 1 ELSE 0 END) * 3.0) * 
                 (LOG(COUNT(DISTINCT ua.user_id) + 1) + 1) AS trending_score
             FROM materials m
             JOIN user_activities ua ON m.id = ua.material_id
             WHERE ua.created_at >= datetime('now', '-7 days')
             AND m.is_public = 1
             ${whereClause}
             GROUP BY m.id, m.title, m.description, m.file_type
             ORDER BY trending_score DESC
             LIMIT $${paramCount + 1}`,
            params
        );

        const trending = result.rows.map(row => ({
            materialId: row.id,
            title: row.title,
            description: row.description,
            fileType: row.file_type,
            trendingScore: row.trending_score,
            uniqueUsers: row.unique_users,
            totalInteractions: row.total_interactions,
            viewCount: row.view_count,
            downloadCount: row.download_count
        }));

        // Cache for 10 minutes (trending changes frequently)
        cache.set(cacheKey, trending, 600000);

        return trending;

    } catch (error) {
        console.error('Error getting trending materials:', error);
        return [];
    }
}

/**
 * Get popular materials (all-time highest interaction scores)
 * @param {number} limit 
 * @param {object} filters - Optional filters
 * @returns {Array} Popular materials
 */
async function getPopularMaterials(limit = 10, filters = {}) {
    const cacheKey = `popular:${JSON.stringify(filters)}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        if (filters.subjectId) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_subjects ms 
                WHERE ms.material_id = m.id AND ms.subject_id = $${paramCount}
            )`);
            params.push(filters.subjectId);
        }

        if (filters.topicId) {
            paramCount++;
            whereConditions.push(`EXISTS (
                SELECT 1 FROM material_topics mt 
                WHERE mt.material_id = m.id AND mt.topic_id = $${paramCount}
            )`);
            params.push(filters.topicId);
        }

        const whereClause = whereConditions.length > 0 ?
            ' WHERE ' + whereConditions.join(' AND ') : '';

        params.push(limit);

        const result = await query(
            `SELECT 
                m.id,
                m.title,
                m.description,
                m.file_type,
                m.download_count,
                COUNT(DISTINCT umi.user_id) AS unique_users,
                SUM(umi.interaction_score) AS total_score,
                AVG(umi.interaction_score) AS avg_score
             FROM materials m
             LEFT JOIN user_material_interactions umi ON m.id = umi.material_id
             ${whereClause}
             GROUP BY m.id, m.title, m.description, m.file_type, m.download_count
             HAVING COUNT(umi.user_id) > 0
             ORDER BY total_score DESC, unique_users DESC
             LIMIT $${paramCount + 1}`,
            params
        );

        const popular = result.rows.map(row => ({
            materialId: row.id,
            title: row.title,
            description: row.description,
            fileType: row.file_type,
            downloadCount: row.download_count,
            uniqueUsers: row.unique_users,
            totalScore: row.total_score,
            avgScore: row.avg_score
        }));

        // Cache for 1 hour (popular materials don't change too frequently)
        cache.set(cacheKey, popular, 3600000);

        return popular;

    } catch (error) {
        console.error('Error getting popular materials:', error);
        return [];
    }
}

/**
 * Get materials similar to a given material
 * @param {number} materialId 
 * @param {number} limit 
 * @returns {Array} Similar materials
 */
async function getSimilarMaterials(materialId, limit = 5) {
    const cacheKey = `similar:${materialId}:${limit}`;

    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        // Get the material's subjects and topics
        const materialInfo = await query(
            `SELECT 
                (SELECT GROUP_CONCAT(subject_id) FROM material_subjects WHERE material_id = $1) AS subject_ids,
                (SELECT GROUP_CONCAT(topic_id) FROM material_topics WHERE material_id = $1) AS topic_ids,
                file_type
             FROM materials
             WHERE id = $1`,
            [materialId]
        );

        if (materialInfo.rows.length === 0) {
            return [];
        }

        const { subject_ids, topic_ids, file_type } = materialInfo.rows[0];
        const subjectIdsList = subject_ids ? subject_ids.split(',') : [];
        const topicIdsList = topic_ids ? topic_ids.split(',') : [];

        if (subjectIdsList.length === 0 && topicIdsList.length === 0) {
            return [];
        }

        // Find similar materials based on shared subjects/topics
        const result = await query(
            `SELECT 
                m.id,
                m.title,
                m.description,
                m.file_type,
                (
                    -- Subject overlap
                    (SELECT COUNT(*) FROM material_subjects ms 
                     WHERE ms.material_id = m.id AND ms.subject_id IN (${subjectIdsList.join(',') || 0})) * 2.0 +
                    -- Topic overlap
                    (SELECT COUNT(*) FROM material_topics mt 
                     WHERE mt.material_id = m.id AND mt.topic_id IN (${topicIdsList.join(',') || 0})) * 3.0 +
                    -- File type match bonus
                    CASE WHEN m.file_type = $2 THEN 1.0 ELSE 0 END
                ) AS similarity_score
             FROM materials m
             WHERE m.id != $1
             AND m.is_public = 1
             AND (
                 EXISTS (SELECT 1 FROM material_subjects ms 
                         WHERE ms.material_id = m.id AND ms.subject_id IN (${subjectIdsList.join(',') || 0}))
                 OR
                 EXISTS (SELECT 1 FROM material_topics mt 
                         WHERE mt.material_id = m.id AND mt.topic_id IN (${topicIdsList.join(',') || 0}))
             )
             ORDER BY similarity_score DESC
             LIMIT $3`,
            [materialId, file_type, limit]
        );

        const similar = result.rows.map(row => ({
            materialId: row.id,
            title: row.title,
            description: row.description,
            fileType: row.file_type,
            similarityScore: row.similarity_score
        }));

        // Cache for 1 hour
        cache.set(cacheKey, similar, 3600000);

        return similar;

    } catch (error) {
        console.error('Error getting similar materials:', error);
        return [];
    }
}

module.exports = {
    getHybridRecommendations,
    getCollaborativeRecommendations,
    getContentBasedRecommendations,
    getTrendingMaterials,
    getPopularMaterials,
    getSimilarMaterials
};
