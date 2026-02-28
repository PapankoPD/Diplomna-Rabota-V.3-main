-- ============================================
-- SQLite Database Schema for Learning Platform
-- Converted from PostgreSQL
-- ============================================

-- Enable foreign key support (MUST be run for each connection)
PRAGMA foreign_keys = ON;

-- ============================================
-- DROP EXISTING TABLES (for clean setup)
-- ============================================

DROP TABLE IF EXISTS material_grades;
DROP TABLE IF EXISTS material_topics;
DROP TABLE IF EXISTS material_subjects;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS material_permissions;
DROP TABLE IF EXISTS material_tags;
DROP TABLE IF EXISTS material_categories;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

-- Drop FTS tables
DROP TABLE IF EXISTS materials_fts;
DROP TABLE IF EXISTS topics_fts;
DROP TABLE IF EXISTS subjects_fts;

-- ============================================
-- CORE AUTHENTICATION TABLES
-- ============================================

-- Users Table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_locked_until ON users(locked_until);

-- Roles Table
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Table
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for permission lookups
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- User-Roles Junction Table (Many-to-Many)
CREATE TABLE user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Create indexes for junction table
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Role-Permissions Junction Table (Many-to-Many)
CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- Create indexes for junction table
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    is_revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for token management
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ============================================
-- MATERIALS TABLES
-- ============================================

-- Materials Table
CREATE TABLE materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_materials_title ON materials(title);
CREATE INDEX idx_materials_uploaded_by ON materials(uploaded_by);
CREATE INDEX idx_materials_file_type ON materials(file_type);
CREATE INDEX idx_materials_is_public ON materials(is_public);
CREATE INDEX idx_materials_created_at ON materials(created_at);

-- Material Categories Table
CREATE TABLE material_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for materials and categories (many-to-many)
CREATE TABLE material_tags (
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES material_categories(id) ON DELETE CASCADE,
    tagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id, category_id)
);

-- Create indexes for junction table
CREATE INDEX idx_material_tags_material_id ON material_tags(material_id);
CREATE INDEX idx_material_tags_category_id ON material_tags(category_id);

-- Groups Table
CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    is_public INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Groups Junction Table
CREATE TABLE user_groups (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, group_id)
);

-- Create indexes for groups
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);

-- Material Permissions Table
CREATE TABLE material_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL CHECK (permission_type IN ('view', 'edit', 'delete')),
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (user_id IS NOT NULL OR role_id IS NOT NULL OR group_id IS NOT NULL)
);

-- Create indexes for permission lookups
CREATE INDEX idx_material_permissions_material_id ON material_permissions(material_id);
CREATE INDEX idx_material_permissions_user_id ON material_permissions(user_id);
CREATE INDEX idx_material_permissions_role_id ON material_permissions(role_id);

-- Material Versions Table
CREATE TABLE material_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT,
    file_path TEXT,
    file_type TEXT,
    file_size INTEGER,
    is_public INTEGER,
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_material_versions_material_id ON material_versions(material_id);

-- ============================================
-- CATEGORIZATION TABLES
-- ============================================

-- Subjects Table
CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subject indexes
CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_active ON subjects(is_active);
CREATE INDEX idx_subjects_display_order ON subjects(display_order);

-- Topics Table (hierarchical structure, belongs to subject)
CREATE TABLE topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Topic indexes
CREATE INDEX idx_topics_subject_id ON topics(subject_id);
CREATE INDEX idx_topics_parent_id ON topics(parent_topic_id);
CREATE INDEX idx_topics_code ON topics(code);
CREATE INDEX idx_topics_difficulty ON topics(difficulty_level);
CREATE INDEX idx_topics_active ON topics(is_active);

-- Grades Table
CREATE TABLE grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    level_order INTEGER UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('K12', 'UNDERGRADUATE', 'GRADUATE', 'PROFESSIONAL')),
    description TEXT,
    age_range TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Grade indexes
CREATE INDEX idx_grades_code ON grades(code);
CREATE INDEX idx_grades_category ON grades(category);
CREATE INDEX idx_grades_level_order ON grades(level_order);
CREATE INDEX idx_grades_active ON grades(is_active);

-- Materials to Subjects Junction
CREATE TABLE material_subjects (
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    is_primary INTEGER DEFAULT 0,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id, subject_id)
);

CREATE INDEX idx_material_subjects_subject ON material_subjects(subject_id);
CREATE INDEX idx_material_subjects_primary ON material_subjects(is_primary);

-- Materials to Topics Junction
CREATE TABLE material_topics (
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    relevance_score REAL DEFAULT 1.0 CHECK (relevance_score BETWEEN 0 AND 1),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id, topic_id)
);

CREATE INDEX idx_material_topics_topic ON material_topics(topic_id);
CREATE INDEX idx_material_topics_relevance ON material_topics(relevance_score);

-- Materials to Grades Junction
CREATE TABLE material_grades (
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    grade_id INTEGER NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    is_primary INTEGER DEFAULT 0,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id, grade_id)
);

CREATE INDEX idx_material_grades_grade ON material_grades(grade_id);
CREATE INDEX idx_material_grades_primary ON material_grades(is_primary);

-- ============================================
-- FULL-TEXT SEARCH (FTS5)
-- ============================================

-- FTS5 virtual table for materials search
CREATE VIRTUAL TABLE materials_fts USING fts5(
    title,
    description,
    file_name,
    content='materials',
    content_rowid='id'
);

-- FTS5 virtual table for topics search
CREATE VIRTUAL TABLE topics_fts USING fts5(
    name,
    code,
    description,
    content='topics',
    content_rowid='id'
);

-- FTS5 virtual table for subjects search
CREATE VIRTUAL TABLE subjects_fts USING fts5(
    name,
    code,
    description,
    content='subjects',
    content_rowid='id'
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp on users
CREATE TRIGGER update_users_updated_at
    AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on materials
CREATE TRIGGER update_materials_updated_at
    AFTER UPDATE ON materials
BEGIN
    UPDATE materials SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on subjects
CREATE TRIGGER update_subjects_updated_at
    AFTER UPDATE ON subjects
BEGIN
    UPDATE subjects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on topics
CREATE TRIGGER update_topics_updated_at
    AFTER UPDATE ON topics
BEGIN
    UPDATE topics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on grades
CREATE TRIGGER update_grades_updated_at
    AFTER UPDATE ON grades
BEGIN
    UPDATE grades SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- FTS SYNC TRIGGERS (Keep FTS in sync with tables)
-- ============================================

-- Materials FTS sync triggers
CREATE TRIGGER materials_fts_insert AFTER INSERT ON materials BEGIN
    INSERT INTO materials_fts(rowid, title, description, file_name)
    VALUES (NEW.id, NEW.title, NEW.description, NEW.file_name);
END;

CREATE TRIGGER materials_fts_update AFTER UPDATE ON materials BEGIN
    UPDATE materials_fts SET 
        title = NEW.title,
        description = NEW.description,
        file_name = NEW.file_name
    WHERE rowid = NEW.id;
END;

CREATE TRIGGER materials_fts_delete AFTER DELETE ON materials BEGIN
    DELETE FROM materials_fts WHERE rowid = OLD.id;
END;

-- Topics FTS sync triggers
CREATE TRIGGER topics_fts_insert AFTER INSERT ON topics BEGIN
    INSERT INTO topics_fts(rowid, name, code, description)
    VALUES (NEW.id, NEW.name, NEW.code, NEW.description);
END;

CREATE TRIGGER topics_fts_update AFTER UPDATE ON topics BEGIN
    UPDATE topics_fts SET 
        name = NEW.name,
        code = NEW.code,
        description = NEW.description
    WHERE rowid = NEW.id;
END;

CREATE TRIGGER topics_fts_delete AFTER DELETE ON topics BEGIN
    DELETE FROM topics_fts WHERE rowid = OLD.id;
END;

-- Subjects FTS sync triggers
CREATE TRIGGER subjects_fts_insert AFTER INSERT ON subjects BEGIN
    INSERT INTO subjects_fts(rowid, name, code, description)
    VALUES (NEW.id, NEW.name, NEW.code, NEW.description);
END;

CREATE TRIGGER subjects_fts_update AFTER UPDATE ON subjects BEGIN
    UPDATE subjects_fts SET 
        name = NEW.name,
        code = NEW.code,
        description = NEW.description
    WHERE rowid = NEW.id;
END;

CREATE TRIGGER subjects_fts_delete AFTER DELETE ON subjects BEGIN
    DELETE FROM subjects_fts WHERE rowid = OLD.id;
END;

-- ============================================
-- VIEWS (SQLite-compatible versions)
-- ============================================

-- View: Topics with subject information
CREATE VIEW topics_with_subject AS
SELECT 
    t.id,
    t.name AS topic_name,
    t.code AS topic_code,
    t.description AS topic_description,
    t.difficulty_level,
    t.parent_topic_id,
    t.display_order,
    s.id AS subject_id,
    s.name AS subject_name,
    s.code AS subject_code,
    pt.name AS parent_topic_name,
    pt.code AS parent_topic_code
FROM topics t
JOIN subjects s ON t.subject_id = s.id
LEFT JOIN topics pt ON t.parent_topic_id = pt.id
WHERE t.is_active = 1;

-- View: Role summary
CREATE VIEW role_summary_view AS
SELECT 
    r.id AS role_id,
    r.name AS role_name,
    r.description,
    COUNT(DISTINCT ur.user_id) AS user_count,
    COUNT(DISTINCT rp.permission_id) AS permission_count
FROM roles r
LEFT JOIN user_roles ur ON r.id = ur.role_id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.description;

-- View: Subject statistics
CREATE VIEW subject_statistics AS
SELECT 
    s.id,
    s.name,
    s.code,
    COUNT(DISTINCT t.id) AS topic_count,
    COUNT(DISTINCT ms.material_id) AS material_count
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id AND t.is_active = 1
LEFT JOIN material_subjects ms ON s.id = ms.subject_id
WHERE s.is_active = 1
GROUP BY s.id, s.name, s.code;

-- View: Topic statistics
CREATE VIEW topic_statistics AS
SELECT 
    t.id,
    t.name,
    t.code,
    t.subject_id,
    s.name AS subject_name,
    t.difficulty_level,
    COUNT(DISTINCT mt.material_id) AS material_count,
    COUNT(DISTINCT child_topics.id) AS subtopic_count
FROM topics t
JOIN subjects s ON t.subject_id = s.id
LEFT JOIN material_topics mt ON t.id = mt.topic_id
LEFT JOIN topics child_topics ON t.id = child_topics.parent_topic_id AND child_topics.is_active = 1
WHERE t.is_active = 1
GROUP BY t.id, t.name, t.code, t.subject_id, s.name, t.difficulty_level;

-- View: Material access summary
CREATE VIEW material_access_summary AS
SELECT 
    m.id AS material_id,
    m.title,
    m.is_public,
    m.uploaded_by AS owner_id,
    COUNT(DISTINCT mp.user_id) AS users_with_access,
    COUNT(DISTINCT mp.role_id) AS roles_with_access
FROM materials m
LEFT JOIN material_permissions mp ON m.id = mp.material_id
GROUP BY m.id, m.title, m.is_public, m.uploaded_by;

-- ============================================
-- SEED DATA - ROLES
-- ============================================

INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrator with full system access'),
    ('user', 'Standard user with basic access'),
    ('guest', 'Guest user with read-only access');

-- ============================================
-- SEED DATA - PERMISSIONS
-- ============================================

INSERT INTO permissions (name, resource, action, description) VALUES
    -- User permissions
    ('users:read', 'users', 'read', 'View user information'),
    ('users:create', 'users', 'create', 'Create new users'),
    ('users:update', 'users', 'update', 'Update user information'),
    ('users:delete', 'users', 'delete', 'Delete users'),
    
    -- Role permissions
    ('roles:read', 'roles', 'read', 'View roles'),
    ('roles:create', 'roles', 'create', 'Create new roles'),
    ('roles:update', 'roles', 'update', 'Update roles'),
    ('roles:delete', 'roles', 'delete', 'Delete roles'),
    ('roles:manage', 'roles', 'manage', 'Manage role assignments'),
    
    -- Permission permissions
    ('permissions:read', 'permissions', 'read', 'View permissions'),
    ('permissions:manage', 'permissions', 'manage', 'Manage permission assignments'),
    
    -- Auth permissions
    ('auth:login', 'auth', 'login', 'User can login'),
    ('auth:refresh', 'auth', 'refresh', 'User can refresh tokens'),
    
    -- Material permissions
    ('materials:create', 'materials', 'create', 'Upload new materials'),
    ('materials:read', 'materials', 'read', 'View materials'),
    ('materials:update', 'materials', 'update', 'Edit material metadata'),
    ('materials:delete', 'materials', 'delete', 'Delete materials'),
    ('materials:admin', 'materials', 'admin', 'Full access to all materials');

-- ============================================
-- SEED DATA - ROLE PERMISSIONS
-- ============================================

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions;

-- User gets basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'user'),
    id
FROM permissions
WHERE name IN ('users:read', 'roles:read', 'permissions:read', 'auth:login', 'auth:refresh', 'materials:create', 'materials:read');

-- Guest gets read-only permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'guest'),
    id
FROM permissions
WHERE name IN ('roles:read', 'permissions:read', 'auth:login', 'materials:read');

-- ============================================
-- SEED DATA - MATERIAL CATEGORIES
-- ============================================

INSERT INTO material_categories (name, description) VALUES
    ('Lecture Notes', 'Course lecture notes and presentations'),
    ('Textbooks', 'Textbooks and reference materials'),
    ('Assignments', 'Homework and assignment materials'),
    ('Exams', 'Practice exams and test materials'),
    ('Videos', 'Video lectures and tutorials'),
    ('Code', 'Source code and programming examples'),
    ('Research Papers', 'Academic papers and articles'),
    ('Other', 'Miscellaneous materials');

-- ============================================
-- SEED DATA - SUBJECTS
-- ============================================

INSERT INTO subjects (name, code, description, icon, display_order) VALUES
    ('Mathematics', 'MATH', 'Mathematical concepts, problem-solving, and computational thinking', 'calculator', 1),
    ('Science', 'SCI', 'Natural sciences including physics, chemistry, and biology', 'flask', 2),
    ('Language Arts', 'LANG', 'Reading, writing, literature, and communication skills', 'book', 3),
    ('Social Studies', 'SOC', 'History, geography, civics, and cultural studies', 'globe', 4),
    ('Arts', 'ART', 'Visual and performing arts, music, and creative expression', 'palette', 5),
    ('Technology', 'TECH', 'Computer science, programming, and digital literacy', 'laptop', 6),
    ('Physical Education', 'PE', 'Physical fitness, sports, and health education', 'heart', 7);

-- ============================================
-- SEED DATA - TOPICS (Mathematics)
-- ============================================

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Arithmetic', 'MATH-ARITH', 'Basic operations with numbers', 1, 1
FROM subjects WHERE code = 'MATH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Algebra', 'MATH-ALG', 'Variables, equations, and functions', 2, 2
FROM subjects WHERE code = 'MATH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Geometry', 'MATH-GEO', 'Shapes, angles, and spatial reasoning', 2, 3
FROM subjects WHERE code = 'MATH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Statistics', 'MATH-STAT', 'Data analysis and probability', 3, 4
FROM subjects WHERE code = 'MATH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Calculus', 'MATH-CALC', 'Derivatives, integrals, and limits', 4, 5
FROM subjects WHERE code = 'MATH';

-- Algebra sub-topics
INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Linear Equations', 'MATH-ALG-LIN', 'Solving linear equations and inequalities', t.id, 2
FROM subjects s, topics t WHERE s.code = 'MATH' AND t.code = 'MATH-ALG';

INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Quadratic Equations', 'MATH-ALG-QUAD', 'Solving quadratic equations', t.id, 3
FROM subjects s, topics t WHERE s.code = 'MATH' AND t.code = 'MATH-ALG';

INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Polynomials', 'MATH-ALG-POLY', 'Working with polynomial expressions', t.id, 3
FROM subjects s, topics t WHERE s.code = 'MATH' AND t.code = 'MATH-ALG';

-- ============================================
-- SEED DATA - TOPICS (Science)
-- ============================================

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Biology', 'SCI-BIO', 'Study of living organisms', 2, 1
FROM subjects WHERE code = 'SCI';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Chemistry', 'SCI-CHEM', 'Study of matter and chemical reactions', 3, 2
FROM subjects WHERE code = 'SCI';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Physics', 'SCI-PHYS', 'Study of matter, energy, and forces', 3, 3
FROM subjects WHERE code = 'SCI';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Earth Science', 'SCI-EARTH', 'Study of Earth and its systems', 2, 4
FROM subjects WHERE code = 'SCI';

-- Biology sub-topics
INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Cell Biology', 'SCI-BIO-CELL', 'Structure and function of cells', t.id, 2
FROM subjects s, topics t WHERE s.code = 'SCI' AND t.code = 'SCI-BIO';

INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Genetics', 'SCI-BIO-GEN', 'Heredity and DNA', t.id, 3
FROM subjects s, topics t WHERE s.code = 'SCI' AND t.code = 'SCI-BIO';

INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Ecology', 'SCI-BIO-ECO', 'Ecosystems and environmental interactions', t.id, 2
FROM subjects s, topics t WHERE s.code = 'SCI' AND t.code = 'SCI-BIO';

-- ============================================
-- SEED DATA - TOPICS (Technology)
-- ============================================

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Programming', 'TECH-PROG', 'Software development and coding', 3, 1
FROM subjects WHERE code = 'TECH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Web Development', 'TECH-WEB', 'Creating websites and web applications', 3, 2
FROM subjects WHERE code = 'TECH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Data Structures', 'TECH-DS', 'Organizing and storing data efficiently', 4, 3
FROM subjects WHERE code = 'TECH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Databases', 'TECH-DB', 'Database design and management', 3, 4
FROM subjects WHERE code = 'TECH';

-- ============================================
-- SEED DATA - TOPICS (Language Arts)
-- ============================================

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Grammar', 'LANG-GRAM', 'Sentence structure and language rules', 2, 1
FROM subjects WHERE code = 'LANG';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Literature', 'LANG-LIT', 'Analysis of literary works', 3, 2
FROM subjects WHERE code = 'LANG';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT id, 'Writing', 'LANG-WRIT', 'Composition and creative writing', 2, 3
FROM subjects WHERE code = 'LANG';

-- ============================================
-- SEED DATA - GRADES (K-12)
-- ============================================

INSERT INTO grades (name, code, level_order, category, age_range) VALUES
    ('Kindergarten', 'K', 0, 'K12', '5-6 years'),
    ('Grade 1', '1', 1, 'K12', '6-7 years'),
    ('Grade 2', '2', 2, 'K12', '7-8 years'),
    ('Grade 3', '3', 3, 'K12', '8-9 years'),
    ('Grade 4', '4', 4, 'K12', '9-10 years'),
    ('Grade 5', '5', 5, 'K12', '10-11 years'),
    ('Grade 6', '6', 6, 'K12', '11-12 years'),
    ('Grade 7', '7', 7, 'K12', '12-13 years'),
    ('Grade 8', '8', 8, 'K12', '13-14 years'),
    ('Grade 9', '9', 9, 'K12', '14-15 years'),
    ('Grade 10', '10', 10, 'K12', '15-16 years'),
    ('Grade 11', '11', 11, 'K12', '16-17 years'),
    ('Grade 12', '12', 12, 'K12', '17-18 years');

-- ============================================
-- SEED DATA - GRADES (University)
-- ============================================

INSERT INTO grades (name, code, level_order, category, description) VALUES
    ('Undergraduate Year 1', 'UG1', 13, 'UNDERGRADUATE', 'First year university/college'),
    ('Undergraduate Year 2', 'UG2', 14, 'UNDERGRADUATE', 'Second year university/college'),
    ('Undergraduate Year 3', 'UG3', 15, 'UNDERGRADUATE', 'Third year university/college'),
    ('Undergraduate Year 4', 'UG4', 16, 'UNDERGRADUATE', 'Fourth year university/college'),
    ('Graduate', 'GRAD', 17, 'GRADUATE', 'Masters and PhD level'),
    ('Professional', 'PROF', 18, 'PROFESSIONAL', 'Professional development and continuing education');

-- ============================================
-- EXAMPLE QUERIES (for reference)
-- ============================================

-- Full-text search for materials:
-- SELECT m.* FROM materials m 
-- JOIN materials_fts fts ON m.id = fts.rowid 
-- WHERE materials_fts MATCH 'search term';

-- Search with ranking:
-- SELECT m.*, bm25(materials_fts) as rank 
-- FROM materials m 
-- JOIN materials_fts fts ON m.id = fts.rowid 
-- WHERE materials_fts MATCH 'search term' 
-- ORDER BY rank;

-- Get user with roles:
-- SELECT u.*, GROUP_CONCAT(r.name) as roles 
-- FROM users u 
-- LEFT JOIN user_roles ur ON u.id = ur.user_id 
-- LEFT JOIN roles r ON ur.role_id = r.id 
-- GROUP BY u.id;

-- Get materials with categories:
-- SELECT m.*, GROUP_CONCAT(mc.name) as categories 
-- FROM materials m 
-- LEFT JOIN material_tags mt ON m.id = mt.material_id 
-- LEFT JOIN material_categories mc ON mt.category_id = mc.id 
-- GROUP BY m.id;

-- Get materials with full categorization:
-- SELECT m.*,
--     GROUP_CONCAT(DISTINCT s.name) as subjects,
--     GROUP_CONCAT(DISTINCT t.name) as topics,
--     GROUP_CONCAT(DISTINCT g.name) as grades
-- FROM materials m
-- LEFT JOIN material_subjects ms ON m.id = ms.material_id
-- LEFT JOIN subjects s ON ms.subject_id = s.id
-- LEFT JOIN material_topics mt ON m.id = mt.material_id
-- LEFT JOIN topics t ON mt.topic_id = t.id
-- LEFT JOIN material_grades mg ON m.id = mg.material_id
-- LEFT JOIN grades g ON mg.grade_id = g.id
-- GROUP BY m.id;

-- Cleanup expired tokens (run this periodically in application code):
-- DELETE FROM refresh_tokens 
-- WHERE expires_at < CURRENT_TIMESTAMP OR is_revoked = 1;

-- Check if user can view material (implement in application code):
-- The PostgreSQL function can_user_view_material() should be implemented
-- as application logic, checking:
-- 1. If material is_public = 1
-- 2. If user is the uploader (uploaded_by = user_id)
-- 3. If user has admin role
-- 4. If user has specific permission in material_permissions
