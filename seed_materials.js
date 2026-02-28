const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'learning_platform.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Adding test materials for filter testing...\n');

// First, let's check what subjects and grades exist
const subjects = db.prepare('SELECT * FROM subjects').all();
const grades = db.prepare('SELECT * FROM grades').all();
const users = db.prepare('SELECT id, username FROM users LIMIT 1').all();

console.log('Existing Subjects:', subjects.map(s => s.name).join(', ') || 'None');
console.log('Existing Grades:', grades.map(g => g.name).join(', ') || 'None');

// Create subjects if they don't exist
const subjectsToCreate = [
    { name: 'Mathematics', code: 'MATH', description: 'Mathematical concepts and problem solving', icon: '📐' },
    { name: 'Physics', code: 'PHYS', description: 'Physical sciences and natural phenomena', icon: '⚛️' },
    { name: 'Chemistry', code: 'CHEM', description: 'Chemical sciences and reactions', icon: '🧪' },
    { name: 'Biology', code: 'BIO', description: 'Life sciences and living organisms', icon: '🧬' },
    { name: 'Computer Science', code: 'CS', description: 'Computing and programming', icon: '💻' },
    { name: 'Literature', code: 'LIT', description: 'Reading and writing skills', icon: '📚' },
    { name: 'History', code: 'HIST', description: 'Historical events and civilizations', icon: '🏛️' }
];

const insertSubject = db.prepare(`
    INSERT OR IGNORE INTO subjects (name, code, description, icon, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
`);

subjectsToCreate.forEach((s, i) => {
    try {
        insertSubject.run(s.name, s.code, s.description, s.icon, i + 1);
    } catch (e) {
        // Already exists
    }
});

// Create grades if they don't exist
const gradesToCreate = [
    { name: '5th Grade', code: 'G5', level_order: 5, category: 'K12', age_range: '10-11' },
    { name: '6th Grade', code: 'G6', level_order: 6, category: 'K12', age_range: '11-12' },
    { name: '7th Grade', code: 'G7', level_order: 7, category: 'K12', age_range: '12-13' },
    { name: '8th Grade', code: 'G8', level_order: 8, category: 'K12', age_range: '13-14' },
    { name: '9th Grade', code: 'G9', level_order: 9, category: 'K12', age_range: '14-15' },
    { name: '10th Grade', code: 'G10', level_order: 10, category: 'K12', age_range: '15-16' },
    { name: '11th Grade', code: 'G11', level_order: 11, category: 'K12', age_range: '16-17' },
    { name: '12th Grade', code: 'G12', level_order: 12, category: 'K12', age_range: '17-18' }
];

const insertGrade = db.prepare(`
    INSERT OR IGNORE INTO grades (name, code, level_order, category, age_range, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
`);

gradesToCreate.forEach(g => {
    try {
        insertGrade.run(g.name, g.code, g.level_order, g.category, g.age_range);
    } catch (e) {
        // Already exists
    }
});

// Get the first user or create a test user
let userId = users[0]?.id;
if (!userId) {
    const result = db.prepare(`
        INSERT INTO users (email, username, password_hash)
        VALUES ('testuploader@test.com', 'testuploader', 'hash')
    `).run();
    userId = result.lastInsertRowid;
}

// Create sample materials
const materials = [
    // Mathematics materials
    { title: 'Algebra Basics', description: 'Introduction to algebraic expressions and equations', file_type: 'application/pdf', subject: 'MATH' },
    { title: 'Geometry Fundamentals', description: 'Shapes, angles, and geometric proofs', file_type: 'application/pdf', subject: 'MATH' },
    { title: 'Calculus Introduction', description: 'Limits, derivatives, and integrals', file_type: 'video/mp4', subject: 'MATH' },
    { title: 'Statistics Workshop', description: 'Data analysis and probability', file_type: 'application/vnd.ms-powerpoint', subject: 'MATH' },

    // Physics materials
    { title: 'Newton\'s Laws of Motion', description: 'Understanding force, mass, and acceleration', file_type: 'application/pdf', subject: 'PHYS' },
    { title: 'Electricity and Magnetism', description: 'Electric circuits and magnetic fields', file_type: 'video/mp4', subject: 'PHYS' },
    { title: 'Thermodynamics Basics', description: 'Heat, temperature, and energy transfer', file_type: 'application/pdf', subject: 'PHYS' },

    // Chemistry materials
    { title: 'Periodic Table Guide', description: 'Elements, atomic structure, and properties', file_type: 'application/pdf', subject: 'CHEM' },
    { title: 'Chemical Reactions Lab', description: 'Hands-on experiments and observations', file_type: 'video/mp4', subject: 'CHEM' },
    { title: 'Organic Chemistry Intro', description: 'Carbon compounds and molecular structures', file_type: 'application/pdf', subject: 'CHEM' },

    // Biology materials
    { title: 'Cell Biology', description: 'Cell structure and function', file_type: 'application/pdf', subject: 'BIO' },
    { title: 'Genetics and DNA', description: 'Heredity and genetic engineering', file_type: 'video/mp4', subject: 'BIO' },
    { title: 'Ecology Systems', description: 'Ecosystems and environmental science', file_type: 'application/pdf', subject: 'BIO' },

    // Computer Science materials
    { title: 'Python Programming', description: 'Learn Python from scratch', file_type: 'text/plain', subject: 'CS' },
    { title: 'Web Development Basics', description: 'HTML, CSS, and JavaScript fundamentals', file_type: 'text/html', subject: 'CS' },
    { title: 'Database Design', description: 'SQL and relational database concepts', file_type: 'application/pdf', subject: 'CS' },
    { title: 'Algorithms and Data Structures', description: 'Sorting, searching, and optimization', file_type: 'video/mp4', subject: 'CS' },

    // Literature materials
    { title: 'Essay Writing Guide', description: 'How to write compelling essays', file_type: 'application/pdf', subject: 'LIT' },
    { title: 'Poetry Analysis', description: 'Understanding poetic devices and themes', file_type: 'application/pdf', subject: 'LIT' },
    { title: 'Shakespeare Study Guide', description: 'Analysis of major works', file_type: 'application/msword', subject: 'LIT' },

    // History materials
    { title: 'World War II Overview', description: 'Causes, events, and consequences', file_type: 'video/mp4', subject: 'HIST' },
    { title: 'Ancient Civilizations', description: 'Egypt, Greece, Rome, and Mesopotamia', file_type: 'application/pdf', subject: 'HIST' },
    { title: 'Industrial Revolution', description: 'Technological and social changes', file_type: 'application/pdf', subject: 'HIST' }
];

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const insertMaterial = db.prepare(`
    INSERT INTO materials (title, description, file_name, file_path, file_type, file_size, uploaded_by, is_public, download_count, average_rating, rating_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
`);

// Get subject IDs
const subjectQuery = db.prepare('SELECT id, code FROM subjects');
const subjectMap = {};
subjectQuery.all().forEach(s => { subjectMap[s.code] = s.id; });

console.log('\nAdding materials...');

materials.forEach((m, index) => {
    const fileName = m.title.toLowerCase().replace(/[^a-z0-9]/g, '_') + getExtension(m.file_type);
    const filePath = `uploads/${fileName}`;
    const fileSize = Math.floor(Math.random() * 5000000) + 100000; // Random size between 100KB and 5MB
    const downloads = Math.floor(Math.random() * 500);
    const avgRating = (Math.random() * 2 + 3).toFixed(2); // Random rating between 3.0 and 5.0
    const ratingCount = Math.floor(Math.random() * 50) + 1;

    try {
        const result = insertMaterial.run(
            m.title,
            m.description,
            fileName,
            filePath,
            m.file_type,
            fileSize,
            userId,
            downloads,
            avgRating,
            ratingCount
        );

        // Link to subject if exists
        const subjectId = subjectMap[m.subject];
        if (subjectId && result.lastInsertRowid) {
            try {
                db.prepare('INSERT OR IGNORE INTO material_subjects (material_id, subject_id) VALUES (?, ?)').run(result.lastInsertRowid, subjectId);
            } catch (e) {
                // Table might not exist
            }
        }

        console.log(`  ✓ Added: ${m.title}`);
    } catch (e) {
        console.log(`  ✗ Skipped (may exist): ${m.title}`);
    }
});

function getExtension(mimeType) {
    const extensions = {
        'application/pdf': '.pdf',
        'video/mp4': '.mp4',
        'text/plain': '.txt',
        'text/html': '.html',
        'application/msword': '.doc',
        'application/vnd.ms-powerpoint': '.ppt'
    };
    return extensions[mimeType] || '.bin';
}

// Show summary
const totalMaterials = db.prepare('SELECT COUNT(*) as count FROM materials').get();
console.log(`\n✓ Total materials in database: ${totalMaterials.count}`);

// Show file type distribution
const fileTypes = db.prepare('SELECT file_type, COUNT(*) as count FROM materials GROUP BY file_type').all();
console.log('\nMaterials by file type:');
fileTypes.forEach(ft => {
    console.log(`  ${ft.file_type}: ${ft.count}`);
});

db.close();
console.log('\nDone! You can now test the filters.');
