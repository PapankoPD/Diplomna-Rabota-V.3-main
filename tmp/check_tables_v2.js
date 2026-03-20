const db = require('better-sqlite3')('learning_platform.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('--- Tables ---');
console.log(tables.map(t => t.name).join(', '));
db.close();
