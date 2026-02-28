-- ============================================
-- Ratings Schema for Materials
-- Performance-optimized with aggregation triggers
-- ============================================

-- 1. Add aggregation columns to materials table (if they don't exist)
-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we'll use a script wrapper or rely on app logic to handle errors if already exists.
-- However, for this SQL file, we will assume they might need to be added.
-- Since we can't do conditional ADD COLUMN in standard SQLite SQL script easily without partial failure,
-- we will attempt to add them. If this script is run via a runner that ignores generic errors, it might work,
-- but better to separate it or tolerate "duplicate column" errors in the node script runner.

-- NOTE: The Node.js runner should handle "duplicate column" errors gracefully.

ALTER TABLE materials ADD COLUMN average_rating REAL DEFAULT 0;
ALTER TABLE materials ADD COLUMN rating_count INTEGER DEFAULT 0;

-- Index for sorting by rating
CREATE INDEX IF NOT EXISTS idx_materials_average_rating ON materials(average_rating);

-- 2. Create Ratings Table
CREATE TABLE IF NOT EXISTS material_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_material_ratings_material_id ON material_ratings(material_id);
CREATE INDEX IF NOT EXISTS idx_material_ratings_user_id ON material_ratings(user_id);

-- 3. Triggers for Automatic Aggregation

-- TRIGGER: After Insert
CREATE TRIGGER IF NOT EXISTS calculate_material_rating_insert
AFTER INSERT ON material_ratings
BEGIN
    UPDATE materials SET 
        rating_count = (SELECT COUNT(*) FROM material_ratings WHERE material_id = NEW.material_id),
        average_rating = (SELECT IFNULL(AVG(rating), 0) FROM material_ratings WHERE material_id = NEW.material_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.material_id;
END;

-- TRIGGER: After Update
CREATE TRIGGER IF NOT EXISTS calculate_material_rating_update
AFTER UPDATE ON material_ratings
BEGIN
    UPDATE materials SET 
        rating_count = (SELECT COUNT(*) FROM material_ratings WHERE material_id = NEW.material_id),
        average_rating = (SELECT IFNULL(AVG(rating), 0) FROM material_ratings WHERE material_id = NEW.material_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.material_id;
END;

-- TRIGGER: After Delete
CREATE TRIGGER IF NOT EXISTS calculate_material_rating_delete
AFTER DELETE ON material_ratings
BEGIN
    UPDATE materials SET 
        rating_count = (SELECT COUNT(*) FROM material_ratings WHERE material_id = OLD.material_id),
        average_rating = (SELECT IFNULL(AVG(rating), 0) FROM material_ratings WHERE material_id = OLD.material_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.material_id;
END;

-- ============================================
-- SEED PERMISSIONS
-- ============================================

INSERT OR IGNORE INTO permissions (name, resource, action, description) VALUES
    ('ratings:create', 'ratings', 'create', 'Rate materials'),
    ('ratings:delete', 'ratings', 'delete', 'Delete own ratings');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'user'),
    id
FROM permissions
WHERE name IN ('ratings:create', 'ratings:delete');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions
WHERE resource = 'ratings';
