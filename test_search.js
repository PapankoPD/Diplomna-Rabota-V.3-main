const sqlite3 = require('better-sqlite3');
const db = sqlite3('./learning_platform.db');
const { generateAccessToken } = require('./src/config/jwt');

const adminUser = db.prepare("SELECT id, username, email FROM users WHERE username = 'admin'").get();

const token = generateAccessToken({
    userId: adminUser.id,
    username: adminUser.username,
    email: adminUser.email
});

(async () => {
    try {
        const matRes = await fetch('http://localhost:3000/api/search/materials?limit=12&page=1&sortBy=created_at&sortOrder=desc', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const details = await matRes.json();
        console.log("Response:", JSON.stringify({
            data_length: details.data?.length,
            pagination: details.pagination
        }, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
