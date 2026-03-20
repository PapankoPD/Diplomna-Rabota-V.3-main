const db = require('better-sqlite3')('learning_platform.db');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='materials'").get();
console.log('--- Schema: materials ---');
console.log(schema.sql);
db.close();
