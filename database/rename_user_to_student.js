const { query } = require('../src/config/database');

async function run() {
    try {
        const r = await query("UPDATE roles SET name='student', description='Student role' WHERE name='user'");
        console.log('Rows updated:', r.rowCount);
        const roles = await query('SELECT id, name FROM roles');
        console.log('Roles now:', JSON.stringify(roles.rows));
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
run();
