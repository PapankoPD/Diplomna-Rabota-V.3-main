-- ============================================
-- Activity Tracking Schema for Recommendation Engine
-- SQLite-compatible schema
-- ============================================

-- User Activities Table (Core activity log)
CREATE TABLE IF NOT EXISTS user_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('view', 'download', 'search')),
    duration_seconds INTEGER DEFAULT 0,
    search_query TEXT,
    search_filters TEXT, -- JSON string for filters (subjects, topics, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_material_id ON user_activities(material_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_material ON user_activities(user_id, material_id);

-- User Material Interactions (Aggregated scores)
CREATE TABLE IF NOT EXISTS user_material_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    interaction_score REAL DEFAULT 0.0, -- Calculated weighted score
    last_interaction_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, material_id)
);

-- Indexes for interactions
CREATE INDEX IF NOT EXISTS idx_user_material_interactions_user_id ON user_material_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_material_interactions_material_id ON user_material_interactions(material_id);
CREATE INDEX IF NOT EXISTS idx_user_material_interactions_score ON user_material_interactions(interaction_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_material_interactions_last_interaction ON user_material_interactions(last_interaction_at);

-- User Preferences (Learned preferences)
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_subjects TEXT, -- JSON array of subject IDs with scores
    preferred_topics TEXT, -- JSON array of topic IDs with scores
    preferred_difficulty_levels TEXT, -- JSON array of difficulty levels with scores
    preferred_file_types TEXT, -- JSON array of file types with scores
    preferred_grade_levels TEXT, -- JSON array of grade IDs with scores
    last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_last_calculated ON user_preferences(last_calculated_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update user_material_interactions on new activity
CREATE TRIGGER IF NOT EXISTS update_interaction_on_activity
AFTER INSERT ON user_activities
WHEN NEW.material_id IS NOT NULL
BEGIN
    INSERT INTO user_material_interactions (user_id, material_id, view_count, download_count, total_duration_seconds, last_interaction_at, interaction_score)
    VALUES (
        NEW.user_id,
        NEW.material_id,
        CASE WHEN NEW.activity_type = 'view' THEN 1 ELSE 0 END,
        CASE WHEN NEW.activity_type = 'download' THEN 1 ELSE 0 END,
        NEW.duration_seconds,
        NEW.created_at,
        -- Initial score calculation: views * 1 + downloads * 3 + duration/60 * 0.5
        (CASE WHEN NEW.activity_type = 'view' THEN 1 ELSE 0 END) * 1.0 +
        (CASE WHEN NEW.activity_type = 'download' THEN 1 ELSE 0 END) * 3.0 +
        (NEW.duration_seconds / 60.0) * 0.5
    )
    ON CONFLICT(user_id, material_id) DO UPDATE SET
        view_count = view_count + CASE WHEN NEW.activity_type = 'view' THEN 1 ELSE 0 END,
        download_count = download_count + CASE WHEN NEW.activity_type = 'download' THEN 1 ELSE 0 END,
        total_duration_seconds = total_duration_seconds + NEW.duration_seconds,
        last_interaction_at = NEW.created_at,
        -- Recalculate score: views * 1 + downloads * 3 + duration/60 * 0.5
        interaction_score = 
            (view_count + CASE WHEN NEW.activity_type = 'view' THEN 1 ELSE 0 END) * 1.0 +
            (download_count + CASE WHEN NEW.activity_type = 'download' THEN 1 ELSE 0 END) * 3.0 +
            ((total_duration_seconds + NEW.duration_seconds) / 60.0) * 0.5,
        updated_at = CURRENT_TIMESTAMP;
END;

-- Trigger to update updated_at on user_preferences
CREATE TRIGGER IF NOT EXISTS update_user_preferences_updated_at
AFTER UPDATE ON user_preferences
BEGIN
    UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- VIEWS
-- ============================================

-- View: Recent user activities (last 30 days)
CREATE VIEW IF NOT EXISTS recent_user_activities AS
SELECT 
    ua.id,
    ua.user_id,
    u.username,
    ua.material_id,
    m.title AS material_title,
    ua.activity_type,
    ua.duration_seconds,
    ua.search_query,
    ua.created_at
FROM user_activities ua
LEFT JOIN users u ON ua.user_id = u.id
LEFT JOIN materials m ON ua.material_id = m.id
WHERE ua.created_at >= datetime('now', '-30 days')
ORDER BY ua.created_at DESC;

-- View: Top user-material interactions
CREATE VIEW IF NOT EXISTS top_user_interactions AS
SELECT 
    umi.user_id,
    u.username,
    umi.material_id,
    m.title AS material_title,
    umi.view_count,
    umi.download_count,
    umi.total_duration_seconds,
    umi.interaction_score,
    umi.last_interaction_at
FROM user_material_interactions umi
JOIN users u ON umi.user_id = u.id
JOIN materials m ON umi.material_id = m.id
ORDER BY umi.interaction_score DESC;

-- View: Trending materials (most active in last 7 days)
CREATE VIEW IF NOT EXISTS trending_materials AS
SELECT 
    m.id,
    m.title,
    m.file_type,
    COUNT(DISTINCT ua.user_id) AS unique_users,
    COUNT(*) AS total_interactions,
    SUM(CASE WHEN ua.activity_type = 'view' THEN 1 ELSE 0 END) AS view_count,
    SUM(CASE WHEN ua.activity_type = 'download' THEN 1 ELSE 0 END) AS download_count,
    -- Trending score: (views * 1 + downloads * 3) * log(unique_users + 1)
    (SUM(CASE WHEN ua.activity_type = 'view' THEN 1 ELSE 0 END) * 1.0 +
     SUM(CASE WHEN ua.activity_type = 'download' THEN 1 ELSE 0 END) * 3.0) * 
     (LOG(COUNT(DISTINCT ua.user_id) + 1) + 1) AS trending_score
FROM materials m
JOIN user_activities ua ON m.id = ua.material_id
WHERE ua.created_at >= datetime('now', '-7 days')
GROUP BY m.id, m.title, m.file_type
ORDER BY trending_score DESC;

-- ============================================
-- COMMENTS
-- ============================================

-- Activity tracking tables for recommendation engine
-- user_activities: Raw activity log (all user interactions)
-- user_material_interactions: Aggregated interaction scores per user-material
-- user_preferences: Learned user preferences from interaction patterns
-- Triggers automatically update interaction scores when new activities are logged
