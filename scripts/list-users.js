/**
 * Script to list all registered users and their roles
 * Run with: node scripts/list-users.js
 */

const { query } = require('../src/config/database');

async function listUsers() {
    console.log('Listing all registered users...\n');

    try {
        const users = await query('SELECT id, email, username, created_at FROM users ORDER BY created_at DESC');

        if (users.rows.length === 0) {
            console.log('No users found in the database.');
        } else {
            console.log(`Found ${users.rows.length} users:\n`);

            for (const user of users.rows) {
                // Get roles for this user
                const roles = await query(
                    `SELECT r.name 
                     FROM roles r 
                     JOIN user_roles ur ON r.id = ur.role_id 
                     WHERE ur.user_id = $1`,
                    [user.id]
                );

                const roleNames = roles.rows.map(r => r.name).join(', ');
                console.log(`ID: ${user.id} | Username: ${user.username} | Email: ${user.email} | Roles: [${roleNames}]`);
            }
        }
    } catch (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }

    process.exit(0);
}

listUsers();
