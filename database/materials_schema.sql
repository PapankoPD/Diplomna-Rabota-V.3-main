-- Material Management System - Database Schema Extension
-- Add this to the existing database or run after init.sql

-- Create materials table
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_materials_title ON materials(title);
CREATE INDEX idx_materials_uploaded_by ON materials(uploaded_by);
CREATE INDEX idx_materials_file_type ON materials(file_type);
CREATE INDEX idx_materials_is_public ON materials(is_public);
CREATE INDEX idx_materials_created_at ON materials(created_at);

-- Create material categories table
CREATE TABLE material_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for materials and categories (many-to-many)
CREATE TABLE material_tags (
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES material_categories(id) ON DELETE CASCADE,
    tagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (material_id, category_id)
);

-- Create indexes for junction table
CREATE INDEX idx_material_tags_material_id ON material_tags(material_id);
CREATE INDEX idx_material_tags_category_id ON material_tags(category_id);

-- Create material permissions table
CREATE TABLE material_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('view', 'edit', 'delete')),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_or_role_required CHECK (user_id IS NOT NULL OR role_id IS NOT NULL)
);

-- Create indexes for permission lookups
CREATE INDEX idx_material_permissions_material_id ON material_permissions(material_id);
CREATE INDEX idx_material_permissions_user_id ON material_permissions(user_id);
CREATE INDEX idx_material_permissions_role_id ON material_permissions(role_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Add material management permissions to the permissions table
INSERT INTO permissions (name, resource, action, description) VALUES
    ('materials:create', 'materials', 'create', 'Upload new materials'),
    ('materials:read', 'materials', 'read', 'View materials'),
    ('materials:update', 'materials', 'update', 'Edit material metadata'),
    ('materials:delete', 'materials', 'delete', 'Delete materials'),
    ('materials:admin', 'materials', 'admin', 'Full access to all materials');

-- Grant material permissions to roles
-- Admin gets all material permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions
WHERE resource = 'materials';

-- User gets basic material permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'user'),
    id
FROM permissions
WHERE name IN ('materials:create', 'materials:read');

-- Create default material categories
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
-- UTILITY VIEWS
-- ============================================

-- View for materials with category information
CREATE OR REPLACE VIEW materials_with_categories AS
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
    u.username AS uploader_username,
    u.email AS uploader_email,
    m.created_at,
    m.updated_at,
    COALESCE(
        json_agg(
            json_build_object('id', mc.id, 'name', mc.name)
        ) FILTER (WHERE mc.id IS NOT NULL),
        '[]'
    ) AS categories
FROM materials m
LEFT JOIN users u ON m.uploaded_by = u.id
LEFT JOIN material_tags mt ON m.id = mt.material_id
LEFT JOIN material_categories mc ON mt.category_id = mc.id
GROUP BY m.id, u.username, u.email;

-- View for material access summary
CREATE OR REPLACE VIEW material_access_summary AS
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
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user can view material
CREATE OR REPLACE FUNCTION can_user_view_material(
    p_material_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_public BOOLEAN;
    v_owner_id UUID;
    v_is_admin BOOLEAN;
    v_has_permission BOOLEAN;
BEGIN
    -- Get material info
    SELECT is_public, uploaded_by INTO v_is_public, v_owner_id
    FROM materials WHERE id = p_material_id;
    
    -- If material doesn't exist, return false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Public materials can be viewed by anyone
    IF v_is_public THEN
        RETURN TRUE;
    END IF;
    
    -- Owner can always view
    IF v_owner_id = p_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is admin
    SELECT EXISTS(
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = 'admin'
    ) INTO v_is_admin;
    
    IF v_is_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Check for specific permission (user-based or role-based)
    SELECT EXISTS(
        SELECT 1 FROM material_permissions mp
        WHERE mp.material_id = p_material_id
        AND mp.permission_type IN ('view', 'edit', 'delete')
        AND (
            mp.user_id = p_user_id
            OR mp.role_id IN (SELECT role_id FROM user_roles WHERE user_id = p_user_id)
        )
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE materials IS 'Stores uploaded learning materials with metadata';
COMMENT ON TABLE material_categories IS 'Categories for organizing materials';
COMMENT ON TABLE material_tags IS 'Many-to-many relationship between materials and categories';
COMMENT ON TABLE material_permissions IS 'Per-material access control';

COMMENT ON COLUMN materials.file_path IS 'Relative path to file in storage';
COMMENT ON COLUMN materials.is_public IS 'If true, visible to all authenticated users';
COMMENT ON COLUMN material_permissions.user_id IS 'Specific user granted permission (nullable if role-based)';
COMMENT ON COLUMN material_permissions.role_id IS 'Role granted permission (nullable if user-based)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Material management schema created successfully!';
    RAISE NOTICE 'Default categories created: Lecture Notes, Textbooks, Assignments, etc.';
    RAISE NOTICE 'Material permissions added to existing roles';
END $$;
