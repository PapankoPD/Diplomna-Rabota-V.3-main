const db = require('better-sqlite3')('learning_platform.db');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='material_versions'").get();
console.log('--- Schema: material_versions ---');
console.log(schema.sql);
db.close();
