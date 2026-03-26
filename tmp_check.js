const { db } = require('./src/config/database');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'user_groups'").get().sql);
