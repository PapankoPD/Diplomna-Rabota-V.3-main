// Find the specific material "fxhghghj" and check if it can be deleted via full API path
const { query } = require('./src/config/database');

async function main() {
    // Find the material
    const mat = await query("SELECT id, title, uploaded_by, file_path FROM materials WHERE title LIKE '%fxhghghj%' OR title LIKE '%fxhg%'");
    console.log('Found materials:', mat.rows);
    
    // Check material_permissions table existence
    const permTable = await query("SELECT sql FROM sqlite_master WHERE type='table' AND name='material_permissions'");
    if (permTable.rows.length > 0) {
        const hasCascade = permTable.rows[0].sql.includes('CASCADE');
        console.log('\nmaterial_permissions CASCADE:', hasCascade);
        console.log('Schema:', permTable.rows[0].sql);
    } else {
        console.log('\nmaterial_permissions table does NOT exist!');
    }
    
    // Check user_groups, material_tags, material_versions
    for (const tableName of ['material_tags', 'material_versions', 'user_groups', 'material_permissions']) {
        const t = await query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
        if (t.rows.length > 0) {
            const hasCascade = t.rows[0].sql.includes('CASCADE');
            console.log(`\n${tableName}: exists=true, CASCADE=${hasCascade}`);
            if (!hasCascade && t.rows[0].sql.includes('material')) {
                console.log('  Schema:', t.rows[0].sql);
            }
        } else {
            console.log(`\n${tableName}: DOES NOT EXIST`);
        }
    }
    
    // Try deleting "fxhghghj" directly
    if (mat.rows.length > 0) {
        const id = mat.rows[0].id;
        console.log('\nTesting direct delete of id:', id);
        try {
            const r = await query('DELETE FROM materials WHERE id = $1', [id]);
            console.log('Direct delete SUCCESS, changes:', r.rowCount);
        } catch (e) {
            console.error('Direct delete FAILED:', e.message);
        }
    }
}

main().catch(console.error);
