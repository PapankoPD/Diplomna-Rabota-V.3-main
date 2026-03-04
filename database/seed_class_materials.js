const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function seed() {
    try {
        // Get admin user ID
        const adminRes = await query('SELECT user_id FROM user_roles WHERE role_id=1 LIMIT 1');
        const uploaderId = adminRes.rows[0]?.user_id || 1;

        // Get all active classes
        const classesRes = await query(`
            SELECT gc.id, gc.name AS class_name, g.name AS grade_name
            FROM grade_classes gc
            JOIN grades g ON gc.grade_id = g.id
            WHERE gc.is_active = 1
            ORDER BY g.level_order, gc.name
        `);

        const classes = classesRes.rows;
        console.log(`Seeding test materials for ${classes.length} classes...`);

        // Create uploads dir if needed
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        for (const cls of classes) {
            const title = `Test Material — ${cls.grade_name} ${cls.class_name}`;
            const description = `Sample study material for ${cls.grade_name}, ${cls.class_name}. This is a test entry.`;
            const fileName = `test_${cls.grade_name.replace(/\s/g, '_')}_${cls.class_name}.txt`;
            const filePath = `uploads/${fileName}`;
            const fullPath = path.join(__dirname, '..', filePath);

            // Write a placeholder text file
            fs.writeFileSync(fullPath, `Test material for ${cls.grade_name} — ${cls.class_name}\n\nThis is a placeholder document created for testing purposes.\n`);

            // Insert material record
            const matRes = await query(
                `INSERT INTO materials (title, description, file_name, file_path, file_type, file_size, uploaded_by, is_public)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [title, description, fileName, filePath, 'text/plain', fs.statSync(fullPath).size, uploaderId, 1]
            );

            const materialId = matRes.rows[0].id;

            // Link to the class
            await query(
                `INSERT OR IGNORE INTO material_grade_classes (material_id, class_id) VALUES ($1, $2)`,
                [materialId, cls.id]
            );

            console.log(`  ✓ ${cls.grade_name} ${cls.class_name} → material #${materialId}`);
        }

        console.log('\nDone!');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
seed();
