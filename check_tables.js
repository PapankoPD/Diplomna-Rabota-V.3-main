const { query } = require('./src/config/database');

async function main() {
    const r = await query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('Tables:', r.rows.map(t => t.name));
    
    // Check if material_grade_classes has cascade
    const schema = await query("SELECT sql FROM sqlite_master WHERE type='table' AND name='material_grade_classes'");
    console.log('material_grade_classes schema:', schema.rows[0]?.sql || 'not found');

    // Check notifications FK
    const nSchema = await query("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'");
    console.log('notifications schema:', nSchema.rows[0]?.sql || 'not found');
}

main().catch(console.error);
