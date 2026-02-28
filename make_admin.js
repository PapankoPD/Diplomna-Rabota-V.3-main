const db = require('better-sqlite3')('learning_platform.db');

const username = 'Papapi';

try {
    // 1. Get User ID
    const user = db.prepare('SELECT id, username, email FROM users WHERE username = ?').get(username);

    if (!user) {
        console.error(`Error: User '${username}' not found!`);
        process.exit(1);
    }

    console.log(`Found user: ${user.username} (ID: ${user.id})`);

    // 2. Get Admin Role ID
    const adminRole = db.prepare("SELECT id, name FROM roles WHERE name = 'admin'").get();

    if (!adminRole) {
        console.error("Error: 'admin' role not found!");
        process.exit(1);
    }

    console.log(`Found role: ${adminRole.name} (ID: ${adminRole.id})`);

    // 3. Check if already has role
    const existingRole = db.prepare('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?')
        .get(user.id, adminRole.id);

    if (existingRole) {
        console.log(`User '${username}' is already an admin.`);
    } else {
        // 4. Assign Admin Role
        db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)')
            .run(user.id, adminRole.id);
        console.log(`Successfully assigned 'admin' role to '${username}'.`);
    }

    // 5. Ensure Admin Role has ALL permissions
    // Find permissions not currently assigned to admin role
    const missingPermissions = db.prepare(`
        SELECT p.id, p.name 
        FROM permissions p
        WHERE p.id NOT IN (
            SELECT permission_id FROM role_permissions WHERE role_id = ?
        )
    `).all(adminRole.id);

    if (missingPermissions.length > 0) {
        console.log(`Found ${missingPermissions.length} permissions missing from 'admin' role. Adding them now...`);

        const insertPerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');

        const transaction = db.transaction((perms) => {
            for (const perm of perms) {
                insertPerm.run(adminRole.id, perm.id);
                console.log(` - Added permission: ${perm.name}`);
            }
        });

        transaction(missingPermissions);
        console.log('All missing permissions added to admin role.');
    } else {
        console.log("'admin' role already has all permissions.");
    }

    console.log('Done.');

} catch (error) {
    console.error('Database error:', error);
} finally {
    db.close();
}
