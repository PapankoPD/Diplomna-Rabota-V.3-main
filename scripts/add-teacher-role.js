/**
 * Migration script to add teacher role and modify permissions
 * Run with: node scripts/add-teacher-role.js
 */

const { query } = require('../src/config/database');

async function runMigration() {
    console.log('Starting teacher role migration...\n');

    try {
        // 1. Create the teacher role
        console.log('1. Creating teacher role...');
        await query(`
            INSERT OR IGNORE INTO roles (name, description) VALUES
            ('teacher', 'Teacher with ability to create and manage learning materials')
        `);
        console.log('   ✓ Teacher role created');

        // 2. Remove materials:create permission from regular 'user' role
        console.log('2. Removing materials:create from user (student) role...');
        await query(`
            DELETE FROM role_permissions 
            WHERE role_id = (SELECT id FROM roles WHERE name = 'user')
            AND permission_id = (SELECT id FROM permissions WHERE name = 'materials:create')
        `);
        console.log('   ✓ materials:create removed from user role');

        // 3. Give teacher role all the permissions a user has
        console.log('3. Copying user permissions to teacher role...');
        await query(`
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
            SELECT 
                (SELECT id FROM roles WHERE name = 'teacher'),
                permission_id
            FROM role_permissions
            WHERE role_id = (SELECT id FROM roles WHERE name = 'user')
        `);
        console.log('   ✓ User permissions copied to teacher');

        // 4. Add materials:create permission to teacher role
        console.log('4. Adding materials:create to teacher role...');
        await query(`
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
            SELECT 
                (SELECT id FROM roles WHERE name = 'teacher'),
                id
            FROM permissions
            WHERE name = 'materials:create'
        `);
        console.log('   ✓ materials:create added to teacher');

        // 5. Add materials:update permission to teacher
        console.log('5. Adding materials:update to teacher role...');
        await query(`
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
            SELECT 
                (SELECT id FROM roles WHERE name = 'teacher'),
                id
            FROM permissions
            WHERE name = 'materials:update'
        `);
        console.log('   ✓ materials:update added to teacher');

        // 6. Add materials:delete permission to teacher
        console.log('6. Adding materials:delete to teacher role...');
        await query(`
            INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
            SELECT 
                (SELECT id FROM roles WHERE name = 'teacher'),
                id
            FROM permissions
            WHERE name = 'materials:delete'
        `);
        console.log('   ✓ materials:delete added to teacher');

        // Verify the changes
        console.log('\n=== Verification ===\n');

        const rolesResult = await query('SELECT id, name, description FROM roles ORDER BY id');
        console.log('Roles:');
        rolesResult.rows.forEach(r => console.log(`  - ${r.name}: ${r.description}`));

        console.log('\nTeacher permissions:');
        const teacherPerms = await query(`
            SELECT p.name, p.description 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = 'teacher'
        `);
        teacherPerms.rows.forEach(p => console.log(`  - ${p.name}: ${p.description}`));

        console.log('\nUser (student) permissions:');
        const userPerms = await query(`
            SELECT p.name, p.description 
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON rp.role_id = r.id
            WHERE r.name = 'user'
        `);
        userPerms.rows.forEach(p => console.log(`  - ${p.name}: ${p.description}`));

        console.log('\n✓ Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

runMigration();
