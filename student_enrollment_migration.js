/**
 * Migration: Create student_class_enrollments table and seed 25 dummy students
 * Run with: node student_enrollment_migration.js
 *
 * After running, go to the Admin > Classes page to enroll students into classes.
 * Or use the seed to auto-enroll them into the first available class.
 */

const bcrypt = require('bcryptjs');
const { query } = require('./src/config/database');

async function migrate() {
    console.log('--- Student Enrollment Migration ---');

    // 1. Create the table
    console.log('\n[1] Creating student_class_enrollments table...');
    await query(`
        CREATE TABLE IF NOT EXISTS student_class_enrollments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            class_id    INTEGER NOT NULL REFERENCES grade_classes(id) ON DELETE CASCADE,
            enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (student_id)   -- one class per student
        )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_sce_student ON student_class_enrollments(student_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sce_class   ON student_class_enrollments(class_id)`);
    console.log('  ✓ Table ready.');

    // 2. Find the first available class
    const classRes = await query(
        `SELECT gc.id, gc.name, g.name AS grade_name
         FROM grade_classes gc
         JOIN grades g ON gc.grade_id = g.id
         WHERE gc.is_active = 1
         ORDER BY g.level_order, gc.name
         LIMIT 1`
    );

    if (classRes.rows.length === 0) {
        console.log('\n  ⚠  No active classes found. Create a class in the Taxonomy page first, then re-run.');
        console.log('  (Table was still created successfully.)');
        process.exit(0);
    }

    const targetClass = classRes.rows[0];
    console.log(`\n[2] Target class: "${targetClass.grade_name} – ${targetClass.name}" (id=${targetClass.id})`);

    // 3. Seed 25 student accounts
    const SALT_ROUNDS = 10;
    const RAW_PASSWORD = 'Student@123';
    const passwordHash = await bcrypt.hash(RAW_PASSWORD, SALT_ROUNDS);

    // Find the 'student' role (may be called 'user' or 'student')
    let roleRes = await query(`SELECT id FROM roles WHERE name = 'student' LIMIT 1`);
    if (roleRes.rows.length === 0) {
        roleRes = await query(`SELECT id FROM roles WHERE name = 'user' LIMIT 1`);
    }
    const studentRoleId = roleRes.rows[0]?.id;

    console.log(`\n[3] Seeding 25 student accounts (password: ${RAW_PASSWORD})...`);
    for (let i = 1; i <= 25; i++) {
        const username = `student${String(i).padStart(2, '0')}`;
        const email = `${username}@school.local`;

        // Upsert user
        let userRes = await query(`SELECT id FROM users WHERE email = $1`, [email]);
        let userId;
        if (userRes.rows.length > 0) {
            userId = userRes.rows[0].id;
            process.stdout.write(`  • ${username} (existing) `);
        } else {
            const ins = await query(
                `INSERT INTO users (email, username, password_hash, is_verified)
                 VALUES ($1, $2, $3, 1) RETURNING id`,
                [email, username, passwordHash]
            );
            userId = ins.rows[0].id;
            process.stdout.write(`  • ${username} (created) `);
        }

        // Assign role
        if (studentRoleId) {
            await query(
                `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
                [userId, studentRoleId]
            );
        }

        // Enroll in class
        await query(
            `INSERT OR REPLACE INTO student_class_enrollments (student_id, class_id)
             VALUES ($1, $2)`,
            [userId, targetClass.id]
        );
        process.stdout.write(`→ enrolled in class ${targetClass.id}\n`);
    }

    // 4. Summary
    const countRes = await query(
        `SELECT COUNT(*) AS cnt FROM student_class_enrollments WHERE class_id = $1`,
        [targetClass.id]
    );
    console.log(`\n  ✓ ${countRes.rows[0].cnt} students now enrolled in "${targetClass.grade_name} – ${targetClass.name}".`);
    console.log('\nMigration complete! Enroll yourself (or any real student) via the admin UI or:');
    console.log(`  INSERT INTO student_class_enrollments (student_id, class_id) VALUES (<your_user_id>, ${targetClass.id});`);
    process.exit(0);
}

migrate().catch(err => {
    console.error('\n✗ Migration failed:', err.message);
    process.exit(1);
});
