const { query } = require('./src/config/database');

// Check ALL tables with material_id column for cascade settings
async function checkAll() {
    const r = await query("SELECT name, sql FROM sqlite_master WHERE type='table'");
    const withMaterialRef = r.rows.filter(t => t.sql && t.sql.includes('material_id') || t.sql && t.sql.includes('materials('));
    for (const t of withMaterialRef) {
        const hasCascade = t.sql.includes('CASCADE');
        console.log(`${t.name}: CASCADE=${hasCascade}`);
        if (!hasCascade && t.sql.includes('material')) {
            console.log('  ⚠️  Schema:', t.sql.slice(0, 200));
        }
    }
    
    // Also try a direct delete via the same path as the API endpoint
    const materials = await query('SELECT id FROM materials LIMIT 1');
    if (materials.rows.length > 0) {
        const id = materials.rows[0].id;
        console.log('\nTest delete of ID:', id);
        try {
            await query('DELETE FROM materials WHERE id = $1', [id]);
            console.log('Delete SUCCESS');
        } catch (e) {
            console.error('Delete FAILED:', e.message);
        }
    }
}

checkAll().catch(console.error);
