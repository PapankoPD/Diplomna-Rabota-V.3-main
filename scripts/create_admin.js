const { getClient, closePool } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');

const createAdmin = async () => {
    let client;
    try {
        console.log('Connecting to database...');
        client = await getClient();

        // 1. Get or Create 'admin' role
        console.log('Checking for admin role...');
        let adminRoleId;
        const roleResult = await client.query('SELECT id FROM roles WHERE name = ?', ['admin']);

        if (roleResult.rows.length === 0) {
            console.log('Admin role not found. Creating...');
            const newRole = await client.query(
                'INSERT INTO roles (name, description) VALUES (?, ?) RETURNING id',
                ['admin', 'Administrator with full access']
            );
            // better-sqlite3 insert returns lastInsertRowid in info object, but our wrapper might handle RETURNING differently
            // Let's check the wrapper implementation in database.js
            // Wrapper returns { rows: [], lastInsertRowid: ... } for standard inserts
            // But if RETURNING is used, it usesstmt.all() so it returns rows.

            if (newRole.rows && newRole.rows.length > 0) {
                adminRoleId = newRole.rows[0].id;
            } else if (newRole.lastInsertRowid) {
                adminRoleId = newRole.lastInsertRowid;
            } else {
                // Fallback fetch
                const refetch = await client.query('SELECT id FROM roles WHERE name = ?', ['admin']);
                adminRoleId = refetch.rows[0].id;
            }
        } else {
            adminRoleId = roleResult.rows[0].id;
            console.log(`Admin role found (ID: ${adminRoleId})`);
        }

        const username = 'admin';
        const email = 'admin@example.com';
        const password = 'admin123';

        // 2. Check if user exists
        console.log(`Checking for user '${username}'...`);
        const userResult = await client.query('SELECT id FROM users WHERE username = ?', [username]);

        let userId;

        if (userResult.rows.length === 0) {
            console.log(`User '${username}' not found. Creating...`);
            const hashedPassword = await hashPassword(password);

            const newUser = await client.query(
                'INSERT INTO users (username, email, password_hash, is_verified) VALUES (?, ?, ?, 1) RETURNING id',
                [username, email, hashedPassword]
            );

            if (newUser.rows && newUser.rows.length > 0) {
                userId = newUser.rows[0].id;
            } else if (newUser.lastInsertRowid) {
                userId = newUser.lastInsertRowid;
            } else {
                const refetch = await client.query('SELECT id FROM users WHERE username = ?', [username]);
                userId = refetch.rows[0].id;
            }
            console.log(`User '${username}' created (ID: ${userId})`);
        } else {
            userId = userResult.rows[0].id;
            console.log(`User '${username}' already exists (ID: ${userId}). Updating password...`);
            const hashedPassword = await hashPassword(password);
            await client.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);
            console.log(`Password updated for user '${username}'`);
        }

        // 3. Assign admin role
        console.log('Assigning admin role...');
        const userRoleCheck = await client.query(
            'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?',
            [userId, adminRoleId]
        );

        if (userRoleCheck.rows.length === 0) {
            await client.query(
                'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
                [userId, adminRoleId]
            );
            console.log(`Role 'admin' assigned to user '${username}'`);
        } else {
            console.log(`User '${username}' already has 'admin' role`);
        }

        console.log('-----------------------------------');
        console.log('Admin account ready:');
        console.log(`Username: ${username}`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('Error creating admin:', error);
    } finally {
        if (client) client.release();
        await closePool();
    }
};

createAdmin();
