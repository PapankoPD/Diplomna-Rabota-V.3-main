const { query } = require('../src/config/database');

async function run() {
    const result = await query(`
        UPDATE materials
        SET title = 'Test Material \u2014 ' || (
            SELECT gc.name FROM grade_classes gc
            JOIN material_grade_classes mgc ON mgc.class_id = gc.id
            WHERE mgc.material_id = materials.id LIMIT 1
        )
        WHERE title LIKE 'Test Material \u2014 Grade%'
    `);
    console.log('Rows updated:', result.rowCount);
    process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
