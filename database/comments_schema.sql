-- ============================================
-- Comments Schema for Moderated Discussion System
-- SQLite-compatible schema
-- ============================================

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL,
    is_edited INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_material_id ON comments(material_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Comment Edit History Table
CREATE TABLE IF NOT EXISTS comment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Who made the edit
    old_content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for history
CREATE INDEX IF NOT EXISTS idx_comment_history_comment_id ON comment_history(comment_id);

-- Trigger to update updated_at on comments
CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
AFTER UPDATE ON comments
BEGIN
    UPDATE comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- PERMISSIONS SEED DATA
-- ============================================

-- Insert comment-related permissions if they don't exist
INSERT OR IGNORE INTO permissions (name, resource, action, description) VALUES
    ('comments:create', 'comments', 'create', 'Post new comments'),
    ('comments:read', 'comments', 'read', 'View comments'),
    ('comments:update', 'comments', 'update', 'Edit own comments'),
    ('comments:delete', 'comments', 'delete', 'Delete own comments'),
    ('comments:moderate', 'comments', 'moderate', 'Moderator actions (hide/delete/restore any)');

-- ============================================
-- ROLE PERMISSIONS UPDATES
-- ============================================

-- Admin gets all comment permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions
WHERE resource = 'comments';

-- User gets create/read/update/delete (own)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'user'),
    id
FROM permissions
WHERE name IN ('comments:create', 'comments:read', 'comments:update', 'comments:delete');

-- Guest gets read-only
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'guest'),
    id
FROM permissions
WHERE name = 'comments:read';
