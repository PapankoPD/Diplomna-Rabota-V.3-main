# SQLite Database Guide

This project now uses **SQLite** as its database engine. This guide explains how to set it up, connect to it, and work with the data.

## 1. Setup

### Prerequisites
- Node.js installed
- Dependencies installed (`npm install`)

### Initialize the Database
We have a script that creates the database file (`learning_platform.db`) and sets up all tables and seed data.

Run this command in your terminal:
```bash
node scripts/init-db.js
```

> **Note:** Running this script will **delete and recreate** the database. Use it to reset your data to the initial state.

---

## 2. Using the Database in Code

I have created a helper module to manage the database connection: `src/config/db.js`.

### Basic Usage
```javascript
const db = require('./src/config/db');

// 1. SELECT (Get all rows)
const users = db.prepare('SELECT * FROM users').all();
console.log(users);

// 2. SELECT (Get single row)
const user = db.prepare('SELECT * FROM users WHERE email = ?').get('user@example.com');

// 3. INSERT / UPDATE / DELETE
const stmt = db.prepare('INSERT INTO roles (name) VALUES (?)');
const result = stmt.run('editor');
console.log(`Inserted row with ID: ${result.lastInsertRowid}`);
```

### Transactions (Safe Multi-step Operations)
```javascript
const transfer = db.transaction((fromId, toId, amount) => {
  db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, fromId);
  db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, toId);
});

transfer(1, 2, 100);
```

---

## 3. Viewing the Data

Since SQLite stores everything in a single file (`learning_platform.db`), you can easily view it using free tools:

### Option A: VS Code Extension (Recommended)
1. Install the **"SQLite Viewer"** extension in VS Code.
2. Click on the `learning_platform.db` file in your file explorer.
3. You can browse tables and run queries directly in the editor.

### Option B: External Tool
1. Download **[DB Browser for SQLite](https://sqlitebrowser.org/)**.
2. Open `learning_platform.db` with it.
3. This gives you a powerful interface to browse data and modify table structures.

---

## 4. Key Differences from PostgreSQL

If you are porting existing code, keep these differences in mind:

1.  **IDs are Integers**: We use `INTEGER PRIMARY KEY AUTOINCREMENT` instead of UUIDs.
2.  **Dates are Strings**: SQLite stores dates as strings (`YYYY-MM-DD HH:MM:SS`).
3.  **No `RETURNING` clause**: `INSERT` statements don't return the row. Use `result.lastInsertRowid` to get the new ID.
4.  **Async vs Sync**: `better-sqlite3` is **synchronous**. You don't need `await` for queries!

---

## 5. Full-Text Search (FTS)

We enabled powerful search for materials. Use the `MATCH` operator:

```sql
SELECT * FROM materials_fts WHERE materials_fts MATCH 'algebra';
```
