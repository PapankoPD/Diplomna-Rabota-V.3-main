const { getClient, closePool } = require('./src/config/database');

const checkData = async () => {
    let client;
    try {
        client = await getClient();

        const tables = ['users', 'roles', 'subjects', 'user_activities', 'user_material_interactions'];

        console.log('--- Database Row Counts ---');
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT count(*) as count FROM ${table}`);
                console.log(`${table}: ${res.rows[0].count}`);
            } catch (e) {
                console.log(`${table}: Error - ${e.message}`);
            }
        }
        console.log('---------------------------');

    } catch (err) {
        console.error('Script error:', err);
    } finally {
        if (client) client.release();
        await closePool();
    }
};

checkData();
