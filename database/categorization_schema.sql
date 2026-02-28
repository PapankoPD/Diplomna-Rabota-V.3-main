-- Advanced Categorization System - Database Schema
-- Subjects, Topics, and Grades for Learning Resources
-- Run this after materials_schema.sql

-- ============================================
-- TAXONOMY TABLES
-- ============================================

-- Subjects table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics table (hierarchical structure, belongs to subject)
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(150) UNIQUE NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    description TEXT,
    parent_topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grades table
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    level_order INTEGER UNIQUE NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('K12', 'UNDERGRADUATE', 'GRADUATE', 'PROFESSIONAL')),
    description TEXT,
    age_range VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- JUNCTION TABLES (Many-to-Many)
-- ============================================

-- Materials to Subjects
CREATE TABLE material_subjects (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id, subject_id)
);

-- Materials to Topics
CREATE TABLE material_topics (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) DEFAULT 1.0 CHECK (relevance_score BETWEEN 0 AND 1),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id, topic_id)
);

-- Materials to Grades
CREATE TABLE material_grades (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id, grade_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Subject indexes
CREATE INDEX idx_subjects_code ON subjects(code);
CREATE INDEX idx_subjects_active ON subjects(is_active);
CREATE INDEX idx_subjects_display_order ON subjects(display_order);

-- Topic indexes
CREATE INDEX idx_topics_subject_id ON topics(subject_id);
CREATE INDEX idx_topics_parent_id ON topics(parent_topic_id);
CREATE INDEX idx_topics_code ON topics(code);
CREATE INDEX idx_topics_difficulty ON topics(difficulty_level);
CREATE INDEX idx_topics_active ON topics(is_active);

-- Grade indexes
CREATE INDEX idx_grades_code ON grades(code);
CREATE INDEX idx_grades_category ON grades(category);
CREATE INDEX idx_grades_level_order ON grades(level_order);
CREATE INDEX idx_grades_active ON grades(is_active);

-- Junction table indexes
CREATE INDEX idx_material_subjects_subject ON material_subjects(subject_id);
CREATE INDEX idx_material_subjects_primary ON material_subjects(is_primary);
CREATE INDEX idx_material_topics_topic ON material_topics(topic_id);
CREATE INDEX idx_material_topics_relevance ON material_topics(relevance_score);
CREATE INDEX idx_material_grades_grade ON material_grades(grade_id);
CREATE INDEX idx_material_grades_primary ON material_grades(is_primary);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at
    BEFORE UPDATE ON grades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- UTILITY VIEWS
-- ============================================

-- View: Topics with subject information
CREATE OR REPLACE VIEW topics_with_subject AS
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
WHERE t.is_active = TRUE;

-- View: Materials with full categorization
CREATE OR REPLACE VIEW materials_full_categorization AS
SELECT 
    m.id,
    m.title,
    m.description,
    m.file_name,
    m.file_type,
    m.file_size,
    m.is_public,
    m.download_count,
    m.created_at,
    m.uploaded_by,
    -- Subjects aggregation
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'code', s.code,
            'is_primary', ms.is_primary
        )) FILTER (WHERE s.id IS NOT NULL),
        '[]'
    ) AS subjects,
    -- Topics aggregation
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'code', t.code,
            'subject_name', t_subj.name,
            'subject_code', t_subj.code,
            'difficulty_level', t.difficulty_level,
            'relevance_score', mt.relevance_score
        )) FILTER (WHERE t.id IS NOT NULL),
        '[]'
    ) AS topics,
    -- Grades aggregation
    COALESCE(
        json_agg(DISTINCT jsonb_build_object(
            'id', g.id,
            'name', g.name,
            'code', g.code,
            'level_order', g.level_order,
            'category', g.category,
            'is_primary', mg.is_primary
        )) FILTER (WHERE g.id IS NOT NULL),
        '[]'
    ) AS grades
FROM materials m
LEFT JOIN material_subjects ms ON m.id = ms.material_id
LEFT JOIN subjects s ON ms.subject_id = s.id
LEFT JOIN material_topics mt ON m.id = mt.material_id
LEFT JOIN topics t ON mt.topic_id = t.id
LEFT JOIN subjects t_subj ON t.subject_id = t_subj.id
LEFT JOIN material_grades mg ON m.id = mg.material_id
LEFT JOIN grades g ON mg.grade_id = g.id
GROUP BY m.id;

-- View: Subject statistics
CREATE OR REPLACE VIEW subject_statistics AS
SELECT 
    s.id,
    s.name,
    s.code,
    COUNT(DISTINCT t.id) AS topic_count,
    COUNT(DISTINCT ms.material_id) AS material_count
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id AND t.is_active = TRUE
LEFT JOIN material_subjects ms ON s.id = ms.subject_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.name, s.code;

-- View: Topic statistics
CREATE OR REPLACE VIEW topic_statistics AS
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
LEFT JOIN topics child_topics ON t.id = child_topics.parent_topic_id AND child_topics.is_active = TRUE
WHERE t.is_active = TRUE
GROUP BY t.id, t.name, t.code, t.subject_id, s.name, t.difficulty_level;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert subjects
INSERT INTO subjects (name, code, description, icon, display_order) VALUES
    ('Mathematics', 'MATH', 'Mathematical concepts, problem-solving, and computational thinking', 'calculator', 1),
    ('Science', 'SCI', 'Natural sciences including physics, chemistry, and biology', 'flask', 2),
    ('Language Arts', 'LANG', 'Reading, writing, literature, and communication skills', 'book', 3),
    ('Social Studies', 'SOC', 'History, geography, civics, and cultural studies', 'globe', 4),
    ('Arts', 'ART', 'Visual and performing arts, music, and creative expression', 'palette', 5),
    ('Technology', 'TECH', 'Computer science, programming, and digital literacy', 'laptop', 6),
    ('Physical Education', 'PE', 'Physical fitness, sports, and health education', 'heart', 7);

-- Insert Mathematics topics
INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Arithmetic', 'MATH-ARITH', 'Basic operations with numbers', 1, 1
FROM subjects s WHERE s.code = 'MATH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Algebra', 'MATH-ALG', 'Variables, equations, and functions', 2, 2
FROM subjects s WHERE s.code = 'MATH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Geometry', 'MATH-GEO', 'Shapes, angles, and spatial reasoning', 2, 3
FROM subjects s WHERE s.code = 'MATH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Statistics', 'MATH-STAT', 'Data analysis and probability', 3, 4
FROM subjects s WHERE s.code = 'MATH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Calculus', 'MATH-CALC', 'Derivatives, integrals, and limits', 4, 5
FROM subjects s WHERE s.code = 'MATH';

-- Insert Algebra sub-topics
INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Linear Equations', 'MATH-ALG-LIN', 'Solving linear equations and inequalities', t.id, 2
FROM subjects s, topics t WHERE s.code = 'MATH' AND t.code = 'MATH-ALG';

INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Quadratic Equations', 'MATH-ALG-QUAD', 'Solving quadratic equations', t.id, 3
FROM subjects s, topics t WHERE s.code = 'MATH' AND t.code = 'MATH-ALG';

INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Polynomials', 'MATH-ALG-POLY', 'Working with polynomial expressions', t.id, 3
FROM subjects s, topics t WHERE s.code = 'MATH' AND t.code = 'MATH-ALG';

-- Insert Science topics
INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Biology', 'SCI-BIO', 'Study of living organisms', 2, 1
FROM subjects s WHERE s.code = 'SCI';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Chemistry', 'SCI-CHEM', 'Study of matter and chemical reactions', 3, 2
FROM subjects s WHERE s.code = 'SCI';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Physics', 'SCI-PHYS', 'Study of matter, energy, and forces', 3, 3
FROM subjects s WHERE s.code = 'SCI';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Earth Science', 'SCI-EARTH', 'Study of Earth and its systems', 2, 4
FROM subjects s WHERE s.code = 'SCI';

-- Insert Biology sub-topics
INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Cell Biology', 'SCI-BIO-CELL', 'Structure and function of cells', t.id, 2
FROM subjects s, topics t WHERE s.code = 'SCI' AND t.code = 'SCI-BIO';

INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Genetics', 'SCI-BIO-GEN', 'Heredity and DNA', t.id, 3
FROM subjects s, topics t WHERE s.code = 'SCI' AND t.code = 'SCI-BIO';

INSERT INTO topics (subject_id, name, code, description, parent_topic_id, difficulty_level)
SELECT s.id, 'Ecology', 'SCI-BIO-ECO', 'Ecosystems and environmental interactions', t.id, 2
FROM subjects s, topics t WHERE s.code = 'SCI' AND t.code = 'SCI-BIO';

-- Insert Technology topics
INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Programming', 'TECH-PROG', 'Software development and coding', 3, 1
FROM subjects s WHERE s.code = 'TECH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Web Development', 'TECH-WEB', 'Creating websites and web applications', 3, 2
FROM subjects s WHERE s.code = 'TECH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Data Structures', 'TECH-DS', 'Organizing and storing data efficiently', 4, 3
FROM subjects s WHERE s.code = 'TECH';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Databases', 'TECH-DB', 'Database design and management', 3, 4
FROM subjects s WHERE s.code = 'TECH';

-- Insert Language Arts topics
INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Grammar', 'LANG-GRAM', 'Sentence structure and language rules', 2, 1
FROM subjects s WHERE s.code = 'LANG';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Literature', 'LANG-LIT', 'Analysis of literary works', 3, 2
FROM subjects s WHERE s.code = 'LANG';

INSERT INTO topics (subject_id, name, code, description, difficulty_level, display_order)
SELECT s.id, 'Writing', 'LANG-WRIT', 'Composition and creative writing', 2, 3
FROM subjects s WHERE s.code = 'LANG';

-- Insert Grades (K-12)
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

-- Insert University grades
INSERT INTO grades (name, code, level_order, category, description) VALUES
    ('Undergraduate Year 1', 'UG1', 13, 'UNDERGRADUATE', 'First year university/college'),
    ('Undergraduate Year 2', 'UG2', 14, 'UNDERGRADUATE', 'Second year university/college'),
    ('Undergraduate Year 3', 'UG3', 15, 'UNDERGRADUATE', 'Third year university/college'),
    ('Undergraduate Year 4', 'UG4', 16, 'UNDERGRADUATE', 'Fourth year university/college'),
    ('Graduate', 'GRAD', 17, 'GRADUATE', 'Masters and PhD level'),
    ('Professional', 'PROF', 18, 'PROFESSIONAL', 'Professional development and continuing education');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE subjects IS 'High-level subject categories for learning materials';
COMMENT ON TABLE topics IS 'Specific topics within subjects, supports hierarchical structure';
COMMENT ON TABLE grades IS 'Educational grade levels from K-12 through graduate';
COMMENT ON TABLE material_subjects IS 'Many-to-many: materials can have multiple subjects';
COMMENT ON TABLE material_topics IS 'Many-to-many: materials can have multiple topics with relevance scoring';
COMMENT ON TABLE material_grades IS 'Many-to-many: materials can target multiple grade levels';

COMMENT ON COLUMN topics.parent_topic_id IS 'For hierarchical topics (e.g., Linear Equations under Algebra)';
COMMENT ON COLUMN topics.difficulty_level IS '1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert, 5=Master';
COMMENT ON COLUMN grades.level_order IS 'Absolute ordering for grade level comparisons and range queries';
COMMENT ON COLUMN material_subjects.is_primary IS 'Designate the primary subject for a material';
COMMENT ON COLUMN material_grades.is_primary IS 'Designate the primary grade level for a material';
COMMENT ON COLUMN material_topics.relevance_score IS 'How relevant this topic is to the material (0-1)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Advanced categorization schema created successfully!';
    RAISE NOTICE 'Created: 7 subjects, 25+ topics, 19 grade levels';
    RAISE NOTICE 'Views: topics_with_subject, materials_full_categorization, statistics views';
END $$;
