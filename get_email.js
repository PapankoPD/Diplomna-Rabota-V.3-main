const { db } = require('./src/config/database');
const user = db.prepare('SELECT email FROM users WHERE id = 24').get();
console.log('User 24 Email:', user.email);
