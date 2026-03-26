const { db } = require('./src/config/database');
console.log(db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name LIKE '%topic%'").all());
