const { db } = require('./src/config/database');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%class%'").all());
