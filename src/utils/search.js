/**
 * SQLite FTS5 Search Utilities
 * Provides full-text search, filtering, and sorting for the learning platform
 */

const { query } = require('../config/database');

/**
 * Search materials using FTS5 with ranking
 * @param {string} queryTerm - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>} Matching materials with relevance scores
 */
async function searchMaterials(queryTerm, options = {}) {
    const {
        limit = 20,
        offset = 0,
        categoryId = null,
        subjectId = null,
        gradeId = null,
        fileType = null,
        isPublic = null,
        uploadedBy = null,
        sortBy = 'relevance', // 'relevance', 'date', 'downloads', 'title'
        sortOrder = 'desc'
    } = options;

    // Build the base query with FTS5
    let sql = `
        SELECT 
            m.id,
            m.title,
            m.description,
            m.file_name,
            m.file_type,
            m.file_size,
            m.is_public,
            m.download_count,
            m.uploaded_by,
            m.created_at,
            m.updated_at,
            u.username AS uploader_username,
            bm25(materials_fts) AS relevance_score
        FROM materials m
        JOIN materials_fts fts ON m.id = fts.rowid
        LEFT JOIN users u ON m.uploaded_by = u.id
        WHERE materials_fts MATCH ?
    `;

    const params = [sanitizeFtsQuery(queryTerm)];

    // Apply filters
    if (categoryId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_tags mt 
            WHERE mt.material_id = m.id AND mt.category_id = ?
        )`;
        params.push(categoryId);
    }

    if (subjectId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_subjects ms 
            WHERE ms.material_id = m.id AND ms.subject_id = ?
        )`;
        params.push(subjectId);
    }

    if (gradeId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_grades mg 
            WHERE mg.material_id = m.id AND mg.grade_id = ?
        )`;
        params.push(gradeId);
    }

    if (fileType !== null) {
        sql += ` AND m.file_type = ?`;
        params.push(fileType);
    }

    if (isPublic !== null) {
        sql += ` AND m.is_public = ?`;
        params.push(isPublic ? 1 : 0);
    }

    if (uploadedBy !== null) {
        sql += ` AND m.uploaded_by = ?`;
        params.push(uploadedBy);
    }

    // Apply sorting
    const sortColumn = getSortColumn(sortBy);
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortColumn} ${order}`;

    // Apply pagination
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
}

/**
 * Count total search results (for pagination)
 */
async function countSearchResults(queryTerm, options = {}) {
    const {
        categoryId = null,
        subjectId = null,
        gradeId = null,
        fileType = null,
        isPublic = null,
        uploadedBy = null
    } = options;

    let sql = `
        SELECT COUNT(*) AS total
        FROM materials m
        JOIN materials_fts fts ON m.id = fts.rowid
        WHERE materials_fts MATCH ?
    `;

    const params = [sanitizeFtsQuery(queryTerm)];

    if (categoryId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_tags mt 
            WHERE mt.material_id = m.id AND mt.category_id = ?
        )`;
        params.push(categoryId);
    }

    if (subjectId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_subjects ms 
            WHERE ms.material_id = m.id AND ms.subject_id = ?
        )`;
        params.push(subjectId);
    }

    if (gradeId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_grades mg 
            WHERE mg.material_id = m.id AND mg.grade_id = ?
        )`;
        params.push(gradeId);
    }

    if (fileType !== null) {
        sql += ` AND m.file_type = ?`;
        params.push(fileType);
    }

    if (isPublic !== null) {
        sql += ` AND m.is_public = ?`;
        params.push(isPublic ? 1 : 0);
    }

    if (uploadedBy !== null) {
        sql += ` AND m.uploaded_by = ?`;
        params.push(uploadedBy);
    }

    const result = await query(sql, params);
    return result.rows[0]?.total || 0;
}

/**
 * Search topics using FTS5
 */
async function searchTopics(queryTerm, options = {}) {
    const { limit = 20, offset = 0, subjectId = null, difficulty = null } = options;

    let sql = `
        SELECT 
            t.id,
            t.name,
            t.code,
            t.description,
            t.difficulty_level,
            t.subject_id,
            s.name AS subject_name,
            s.code AS subject_code,
            bm25(topics_fts) AS relevance_score
        FROM topics t
        JOIN topics_fts fts ON t.id = fts.rowid
        LEFT JOIN subjects s ON t.subject_id = s.id
        WHERE topics_fts MATCH ?
        AND t.is_active = 1
    `;

    const params = [sanitizeFtsQuery(queryTerm)];

    if (subjectId !== null) {
        sql += ` AND t.subject_id = ?`;
        params.push(subjectId);
    }

    if (difficulty !== null) {
        sql += ` AND t.difficulty_level = ?`;
        params.push(difficulty);
    }

    sql += ` ORDER BY relevance_score LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
}

/**
 * Search subjects using FTS5
 */
async function searchSubjects(queryTerm, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const sql = `
        SELECT 
            s.id,
            s.name,
            s.code,
            s.description,
            s.icon,
            bm25(subjects_fts) AS relevance_score
        FROM subjects s
        JOIN subjects_fts fts ON s.id = fts.rowid
        WHERE subjects_fts MATCH ?
        AND s.is_active = 1
        ORDER BY relevance_score
        LIMIT ? OFFSET ?
    `;

    const result = await query(sql, [sanitizeFtsQuery(queryTerm), limit, offset]);
    return result.rows;
}

/**
 * Global search across all content types
 */
async function globalSearch(queryTerm, options = {}) {
    const { limit = 10 } = options;

    const [materials, topics, subjects] = await Promise.all([
        searchMaterials(queryTerm, { limit }),
        searchTopics(queryTerm, { limit }),
        searchSubjects(queryTerm, { limit })
    ]);

    return {
        materials,
        topics,
        subjects,
        query: queryTerm
    };
}

/**
 * List materials with filtering (no search query)
 */
async function listMaterials(options = {}) {
    const {
        limit = 20,
        offset = 0,
        categoryId = null,
        subjectId = null,
        gradeId = null,
        fileType = null,
        isPublic = null,
        uploadedBy = null,
        sortBy = 'date',
        sortOrder = 'desc'
    } = options;

    let sql = `
        SELECT 
            m.id,
            m.title,
            m.description,
            m.file_name,
            m.file_type,
            m.file_size,
            m.is_public,
            m.download_count,
            m.uploaded_by,
            m.created_at,
            m.updated_at,
            u.username AS uploader_username
        FROM materials m
        LEFT JOIN users u ON m.uploaded_by = u.id
        WHERE 1=1
    `;

    const params = [];

    if (categoryId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_tags mt 
            WHERE mt.material_id = m.id AND mt.category_id = ?
        )`;
        params.push(categoryId);
    }

    if (subjectId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_subjects ms 
            WHERE ms.material_id = m.id AND ms.subject_id = ?
        )`;
        params.push(subjectId);
    }

    if (gradeId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_grades mg 
            WHERE mg.material_id = m.id AND mg.grade_id = ?
        )`;
        params.push(gradeId);
    }

    if (fileType !== null) {
        sql += ` AND m.file_type = ?`;
        params.push(fileType);
    }

    if (isPublic !== null) {
        sql += ` AND m.is_public = ?`;
        params.push(isPublic ? 1 : 0);
    }

    if (uploadedBy !== null) {
        sql += ` AND m.uploaded_by = ?`;
        params.push(uploadedBy);
    }

    // Apply sorting
    const sortColumn = getSortColumn(sortBy);
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortColumn} ${order}`;

    // Apply pagination
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
}

/**
 * Count total materials (for pagination without search)
 */
async function countMaterials(options = {}) {
    const {
        categoryId = null,
        subjectId = null,
        gradeId = null,
        fileType = null,
        isPublic = null,
        uploadedBy = null
    } = options;

    let sql = `SELECT COUNT(*) AS total FROM materials m WHERE 1=1`;
    const params = [];

    if (categoryId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_tags mt 
            WHERE mt.material_id = m.id AND mt.category_id = ?
        )`;
        params.push(categoryId);
    }

    if (subjectId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_subjects ms 
            WHERE ms.material_id = m.id AND ms.subject_id = ?
        )`;
        params.push(subjectId);
    }

    if (gradeId !== null) {
        sql += ` AND EXISTS (
            SELECT 1 FROM material_grades mg 
            WHERE mg.material_id = m.id AND mg.grade_id = ?
        )`;
        params.push(gradeId);
    }

    if (fileType !== null) {
        sql += ` AND m.file_type = ?`;
        params.push(fileType);
    }

    if (isPublic !== null) {
        sql += ` AND m.is_public = ?`;
        params.push(isPublic ? 1 : 0);
    }

    if (uploadedBy !== null) {
        sql += ` AND m.uploaded_by = ?`;
        params.push(uploadedBy);
    }

    const result = await query(sql, params);
    return result.rows[0]?.total || 0;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sanitize FTS5 query to prevent syntax errors
 * Escapes special characters and handles edge cases
 */
function sanitizeFtsQuery(query) {
    if (!query || typeof query !== 'string') {
        return '*'; // Match all if empty
    }

    // Remove special FTS5 operators that could cause errors
    let sanitized = query
        .replace(/[*:()^~"-]/g, ' ')  // Remove special chars
        .replace(/\s+/g, ' ')          // Collapse whitespace
        .trim();

    if (!sanitized) {
        return '*';
    }

    // Add prefix matching for partial word searches
    const words = sanitized.split(' ').filter(w => w.length > 0);
    return words.map(word => `"${word}"*`).join(' OR ');
}

/**
 * Map sort parameter to actual column
 */
function getSortColumn(sortBy) {
    const sortMap = {
        'relevance': 'relevance_score',
        'date': 'm.created_at',
        'updated': 'm.updated_at',
        'downloads': 'm.download_count',
        'title': 'm.title',
        'size': 'm.file_size'
    };
    return sortMap[sortBy] || 'm.created_at';
}

/**
 * Get autocomplete suggestions
 */
async function getAutocompleteSuggestions(queryTerm, limit = 5) {
    if (!queryTerm || queryTerm.length < 2) {
        return [];
    }

    const sanitized = sanitizeFtsQuery(queryTerm);

    const sql = `
        SELECT title AS suggestion, 'material' AS type
        FROM materials_fts
        WHERE materials_fts MATCH ?
        LIMIT ?
    `;

    const result = await query(sql, [sanitized, limit]);
    return result.rows;
}

module.exports = {
    searchMaterials,
    countSearchResults,
    searchTopics,
    searchSubjects,
    globalSearch,
    listMaterials,
    countMaterials,
    sanitizeFtsQuery,
    getAutocompleteSuggestions
};
