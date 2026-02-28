/**
 * Activity Tracker - Record user interactions for recommendations
 */

const { query } = require('../config/database');

/**
 * Track material view
 * @param {number} userId 
 * @param {number} materialId 
 * @param {number} durationSeconds - How long user viewed (optional)
 */
async function trackView(userId, materialId, durationSeconds = 0) {
    try {
        await query(
            `INSERT INTO user_activities (user_id, material_id, activity_type, duration_seconds)
             VALUES ($1, $2, 'view', $3)`,
            [userId, materialId, durationSeconds]
        );
    } catch (error) {
        console.error('Error tracking view:', error);
        // Don't throw - tracking failures shouldn't break main flow
    }
}

/**
 * Track material download
 * @param {number} userId 
 * @param {number} materialId 
 */
async function trackDownload(userId, materialId) {
    try {
        await query(
            `INSERT INTO user_activities (user_id, material_id, activity_type)
             VALUES ($1, $2, 'download')`,
            [userId, materialId]
        );
    } catch (error) {
        console.error('Error tracking download:', error);
    }
}

/**
 * Track search activity
 * @param {number} userId 
 * @param {string} searchQuery 
 * @param {object} filters - Search filters (subjects, topics, etc.)
 */
async function trackSearch(userId, searchQuery, filters = {}) {
    try {
        const filtersJson = JSON.stringify(filters);

        await query(
            `INSERT INTO user_activities (user_id, activity_type, search_query, search_filters)
             VALUES ($1, 'search', $2, $3)`,
            [userId, searchQuery, filtersJson]
        );
    } catch (error) {
        console.error('Error tracking search:', error);
    }
}

/**
 * Update user preferences based on recent interactions
 * Analyzes user's interaction patterns and stores learned preferences
 * @param {number} userId 
 */
async function updateUserPreferences(userId) {
    try {
        // Get user's top interactions
        const interactions = await query(
            `SELECT 
                m.id AS material_id,
                umi.interaction_score,
                m.file_type,
                GROUP_CONCAT(DISTINCT s.id) AS subject_ids,
                GROUP_CONCAT(DISTINCT t.id) AS topic_ids,
                GROUP_CONCAT(DISTINCT t.difficulty_level) AS difficulty_levels,
                GROUP_CONCAT(DISTINCT g.id) AS grade_ids
             FROM user_material_interactions umi
             JOIN materials m ON umi.material_id = m.id
             LEFT JOIN material_subjects ms ON m.id = ms.material_id
             LEFT JOIN subjects s ON ms.subject_id = s.id
             LEFT JOIN material_topics mt ON m.id = mt.material_id
             LEFT JOIN topics t ON mt.topic_id = t.id
             LEFT JOIN material_grades mg ON m.id = mg.material_id
             LEFT JOIN grades g ON mg.grade_id = g.id
             WHERE umi.user_id = $1 AND umi.interaction_score > 0
             GROUP BY m.id, umi.interaction_score, m.file_type
             ORDER BY umi.interaction_score DESC
             LIMIT 50`,
            [userId]
        );

        if (interactions.rows.length === 0) {
            return; // No interactions yet
        }

        // Calculate preference scores
        const subjectScores = {};
        const topicScores = {};
        const difficultyScores = {};
        const fileTypeScores = {};
        const gradeScores = {};

        interactions.rows.forEach(row => {
            const score = row.interaction_score;

            // Subjects
            if (row.subject_ids) {
                row.subject_ids.split(',').forEach(subjectId => {
                    subjectScores[subjectId] = (subjectScores[subjectId] || 0) + score;
                });
            }

            // Topics
            if (row.topic_ids) {
                row.topic_ids.split(',').forEach(topicId => {
                    topicScores[topicId] = (topicScores[topicId] || 0) + score;
                });
            }

            // Difficulty levels
            if (row.difficulty_levels) {
                row.difficulty_levels.split(',').forEach(level => {
                    difficultyScores[level] = (difficultyScores[level] || 0) + score;
                });
            }

            // File types
            if (row.file_type) {
                fileTypeScores[row.file_type] = (fileTypeScores[row.file_type] || 0) + score;
            }

            // Grades
            if (row.grade_ids) {
                row.grade_ids.split(',').forEach(gradeId => {
                    gradeScores[gradeId] = (gradeScores[gradeId] || 0) + score;
                });
            }
        });

        // Convert to sorted arrays
        const toSortedArray = (obj) => {
            return Object.entries(obj)
                .sort((a, b) => b[1] - a[1])
                .map(([id, score]) => ({ id: parseInt(id), score }));
        };

        const preferences = {
            preferred_subjects: JSON.stringify(toSortedArray(subjectScores)),
            preferred_topics: JSON.stringify(toSortedArray(topicScores)),
            preferred_difficulty_levels: JSON.stringify(toSortedArray(difficultyScores)),
            preferred_file_types: JSON.stringify(
                Object.entries(fileTypeScores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, score]) => ({ type, score }))
            ),
            preferred_grade_levels: JSON.stringify(toSortedArray(gradeScores))
        };

        // Upsert user preferences
        await query(
            `INSERT INTO user_preferences (user_id, preferred_subjects, preferred_topics, preferred_difficulty_levels, preferred_file_types, preferred_grade_levels, last_calculated_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id) DO UPDATE SET
                preferred_subjects = $2,
                preferred_topics = $3,
                preferred_difficulty_levels = $4,
                preferred_file_types = $5,
                preferred_grade_levels = $6,
                last_calculated_at = CURRENT_TIMESTAMP`,
            [userId, preferences.preferred_subjects, preferences.preferred_topics,
                preferences.preferred_difficulty_levels, preferences.preferred_file_types,
                preferences.preferred_grade_levels]
        );

    } catch (error) {
        console.error('Error updating user preferences:', error);
    }
}

/**
 * Get user's calculated preferences
 * @param {number} userId 
 * @returns {object|null} User preferences or null if not exist
 */
async function getUserPreferences(userId) {
    try {
        const result = await query(
            'SELECT * FROM user_preferences WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const prefs = result.rows[0];

        // Parse JSON fields
        return {
            userId: prefs.user_id,
            subjects: JSON.parse(prefs.preferred_subjects || '[]'),
            topics: JSON.parse(prefs.preferred_topics || '[]'),
            difficultyLevels: JSON.parse(prefs.preferred_difficulty_levels || '[]'),
            fileTypes: JSON.parse(prefs.preferred_file_types || '[]'),
            gradeLevels: JSON.parse(prefs.preferred_grade_levels || '[]'),
            lastCalculatedAt: prefs.last_calculated_at
        };
    } catch (error) {
        console.error('Error getting user preferences:', error);
        return null;
    }
}

module.exports = {
    trackView,
    trackDownload,
    trackSearch,
    updateUserPreferences,
    getUserPreferences
};
