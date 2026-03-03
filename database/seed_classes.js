const { query } = require('../src/config/database');

async function seed() {
    try {
        const gradesRes = await query(`SELECT id, name, code FROM grades WHERE is_active = 1 ORDER BY level_order`);
        const grades = gradesRes.rows;
        console.log(`Found ${grades.length} grades. Adding class-A and class-B to each...`);

        let created = 0, skipped = 0;
        for (const grade of grades) {
            for (const suffix of ['A', 'B']) {
                const name = `${grade.code}-${suffix}`;
                const existing = await query(`SELECT id FROM grade_classes WHERE grade_id = $1 AND name = $2`, [grade.id, name]);
                if (existing.rows.length > 0) {
                    console.log(`  ⚠ Already exists: ${name}`);
                    skipped++;
                    continue;
                }
                await query(`INSERT INTO grade_classes (grade_id, name) VALUES ($1, $2)`, [grade.id, name]);
                console.log(`  ✓ Created: ${name}`);
                created++;
            }
        }
        console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
        process.exit(0);
    } catch (e) {
        console.error('Failed:', e.message);
        process.exit(1);
    }
}
seed();
