const { db } = require('./src/config/database');
const notifs = db.prepare('SELECT * FROM notifications WHERE user_id = 24 ORDER BY created_at DESC LIMIT 5').all();
console.log('Notifications for NIK (user 24):');
notifs.forEach(n => console.log(`  [${n.is_read ? 'READ' : 'UNREAD'}] ${n.message} (${n.created_at})`));
console.log('\nTotal unread:', notifs.filter(n => !n.is_read).length);
