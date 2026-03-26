const db = require('./src/config/database');
async function run() {
    const res = await db.query("SELECT name, sql FROM sqlite_master WHERE type='table'");
    console.log(JSON.stringify(res.rows, null, 2));
}
run();
