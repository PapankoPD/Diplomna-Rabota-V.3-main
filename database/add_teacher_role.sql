-- ============================================
-- Add Teacher Role Migration
-- This script creates a teacher role and removes
-- materials:create permission from regular users
-- ============================================

-- 1. Create the teacher role
INSERT OR IGNORE INTO roles (name, description) VALUES
    ('teacher', 'Teacher with ability to create and manage learning materials');

-- 2. Remove materials:create permission from regular 'user' role
DELETE FROM role_permissions 
WHERE role_id = (SELECT id FROM roles WHERE name = 'user')
AND permission_id = (SELECT id FROM permissions WHERE name = 'materials:create');

-- 3. Give teacher role all the permissions a user has
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'teacher'),
    permission_id
FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'user');

-- 4. Add materials:create permission to teacher role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'teacher'),
    id
FROM permissions
WHERE name = 'materials:create';

-- 5. Add materials:update permission to teacher (for editing their own materials)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'teacher'),
    id
FROM permissions
WHERE name = 'materials:update';

-- 6. Add materials:delete permission to teacher (for deleting their own materials)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'teacher'),
    id
FROM permissions
WHERE name = 'materials:delete';

-- Verify the changes
SELECT 'Roles after migration:' as info;
SELECT id, name, description FROM roles;

SELECT 'Teacher permissions:' as info;
SELECT p.name, p.description 
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'teacher';

SELECT 'User (student) permissions:' as info;
SELECT p.name, p.description 
FROM permissions p
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'user';
