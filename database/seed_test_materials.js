const { query } = require('../src/config/database');
const path = require('path');
const fs = require('fs');

async function seed() {
    try {
        // Get admin user
        const userRes = await query(`SELECT id FROM users LIMIT 1`);
        if (userRes.rows.length === 0) {
            console.error('No users found. Please create a user first.');
            process.exit(1);
        }
        const userId = userRes.rows[0].id;

        // Get all active grades
        const gradesRes = await query(`SELECT id, name, code FROM grades WHERE is_active = 1 ORDER BY level_order`);
        const grades = gradesRes.rows;
        console.log(`Found ${grades.length} grades. Seeding materials...`);

        // Ensure the uploads directory exists and create a dummy file
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const dummyFileName = 'test_material_placeholder.txt';
        const dummyFilePath = path.join(uploadsDir, dummyFileName);
        if (!fs.existsSync(dummyFilePath)) {
            fs.writeFileSync(dummyFilePath, 'This is a test material placeholder file.\n');
        }

        const relativeFilePath = path.join('uploads', dummyFileName);

        let created = 0;
        for (const grade of grades) {
            const title = `Test Material - ${grade.name}`;
            const description = `Sample educational material for ${grade.name}. Use this to test grade-based filtering.`;

            // Check if already exists
            const existing = await query(
                `SELECT id FROM materials WHERE title = $1`,
                [title]
            );
            if (existing.rows.length > 0) {
                console.log(`  ⚠ Already exists: "${title}" — skipping`);
                continue;
            }

            // Insert material
            const matRes = await query(
                `INSERT INTO materials (title, description, file_name, file_path, file_type, file_size, uploaded_by, is_public)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
                 RETURNING id`,
                [title, description, dummyFileName, relativeFilePath, 'text/plain', 42, userId]
            );
            const materialId = matRes.rows[0].id;

            // Link to grade
            await query(
                `INSERT INTO material_grades (material_id, grade_id, is_primary) VALUES ($1, $2, 1)`,
                [materialId, grade.id]
            );

            console.log(`  ✓ Created: "${title}" (grade ${grade.code})`);
            created++;
        }

        console.log(`\nDone. Created ${created} test materials.`);
        process.exit(0);
    } catch (e) {
        console.error('Seeding failed:', e.message);
        process.exit(1);
    }
}

seed();
