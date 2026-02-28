/**
 * Script to promote a user to a specific role (default: teacher)
 * Usage: node scripts/promote-user.js <email> [role]
 */

const { query } = require('../src/config/database');

async function promoteUser() {
    const email = process.argv[2];
    const roleName = process.argv[3] || 'teacher';

    if (!email) {
        console.error('Usage: node scripts/promote-user.js <email> [role]');
        process.exit(1);
    }

    console.log(`Promoting user ${email} to role '${roleName}'...\n`);

    try {
        // 1. Find the user
        const userResult = await query('SELECT id, username FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            console.error(`Error: User with email '${email}' not found.`);
            process.exit(1);
        }

        const user = userResult.rows[0];
        console.log(`Found user: ${user.username} (ID: ${user.id})`);

        // 2. Find the role
        const roleResult = await query('SELECT id FROM roles WHERE name = $1', [roleName]);

        if (roleResult.rows.length === 0) {
            console.error(`Error: Role '${roleName}' not found.`);
            process.exit(1);
        }

        const roleId = roleResult.rows[0].id;

        // 3. Assign the role
        // Check if already assigned
        const existingRole = await query(
            'SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2',
            [user.id, roleId]
        );

        if (existingRole.rows.length > 0) {
            console.log(`User already has the '${roleName}' role.`);
        } else {
            await query(
                'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
                [user.id, roleId]
            );
            console.log(`✓ Successfully assigned '${roleName}' role to user.`);
        }

        // 4. Verify permissions
        console.log('\nUser now has the following roles:');
        const roles = await query(
            `SELECT r.name, r.description 
             FROM roles r 
             JOIN user_roles ur ON r.id = ur.role_id 
             WHERE ur.user_id = $1`,
            [user.id]
        );
        roles.rows.forEach(r => console.log(`  - ${r.name}`));

    } catch (error) {
        console.error('Promotion failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

promoteUser();
