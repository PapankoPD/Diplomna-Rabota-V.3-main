const { db } = require('./src/config/database');
const notifs = db.prepare('SELECT id, is_read, type FROM notifications WHERE user_id = 24 ORDER BY created_at DESC LIMIT 5').all();
console.log('Exact DB values for NIK:');
console.table(notifs);
