const { query } = require('./src/config/database');

async function testDelete() {
    // Get first material in DB
    const materials = await query('SELECT id, title, file_path FROM materials LIMIT 3');
    console.log('Available materials:', materials.rows.map(m => ({ id: m.id, title: m.title })));
    
    if (materials.rows.length === 0) {
        console.log('No materials found');
        return;
    }

    // Try to delete the first one
    const mat = materials.rows[0];
    console.log('\nAttempting to delete:', mat.id, mat.title);
    
    try {
        const result = await query('DELETE FROM materials WHERE id = $1', [mat.id]);
        console.log('Delete result:', result);
    } catch (e) {
        console.error('DELETE ERROR:', e.message);
        console.error(e);
    }
}

testDelete().catch(console.error);
