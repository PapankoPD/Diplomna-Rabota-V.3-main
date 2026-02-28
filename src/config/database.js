const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../learning_platform.db');

let db;

try {
    db = new Database(DB_PATH, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null
    });

    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    console.log(`Connected to SQLite database at ${DB_PATH}`);
} catch (error) {
    console.error('Failed to connect to SQLite database:', error);
    process.exit(1);
}

/**
 * Execute a query with parameters
 * Converts PostgreSQL syntax ($1, $2, etc.) to SQLite syntax (?)
 */
const query = async (text, params = []) => {
    // Normalize params to array if not already (though usually it is)
    if (!Array.isArray(params)) {
        params = [params];
    }

    // Parse SQL to find all parameters and their positions
    // We need to map $1, $2, $2 to [val1, val2, val2] and ?, ?, ?
    const paramMatches = text.match(/\$\d+/g);
    let normalizedParams = [];

    if (paramMatches) {
        // Create new params array based on order of appearance in SQL
        normalizedParams = paramMatches.map(param => {
            const index = parseInt(param.substring(1)) - 1; // $1 is index 0
            let value = params[index];

            // Apply conversions
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (typeof value === 'boolean') {
                return value ? 1 : 0;
            }
            return value;
        });
    } else {
        // No $ params, maybe it's already ? or no params (rare in this codebase)
        // Or if params passed but no $ placeholders (shouldn't happen with correct usage)
        if (params.length > 0 && !text.includes('$')) {
            // Assume direct mapping if ? used (not expected from PG codebase but safe fallback)
            normalizedParams = params.map(p => {
                if (p instanceof Date) return p.toISOString();
                if (typeof p === 'boolean') return p ? 1 : 0;
                return p;
            });
        }
    }

    // Convert $1, $2, etc. to ?
    const sql = text.replace(/\$\d+/g, '?');

    try {
        const stmt = db.prepare(sql);

        let result;
        // Check if it's a SELECT or has RETURNING to decide method
        // better-sqlite3 doesn't automatically return rows for run()
        if (sql.trim().toUpperCase().startsWith('SELECT') ||
            sql.trim().toUpperCase().includes('RETURNING') ||
            sql.trim().toUpperCase().startsWith('WITH')) {
            const rows = stmt.all(normalizedParams);
            return {
                rows,
                rowCount: rows.length,
                command: 'SELECT' // Mock command name
            };
        } else {
            const info = stmt.run(normalizedParams);
            return {
                rows: [],
                rowCount: info.changes,
                command: 'INSERT/UPDATE/DELETE', // Mock
                lastInsertRowid: info.lastInsertRowid
            };
        }
    } catch (error) {
        // Enhance error message with query context
        console.error('Database query error:', error.message);
        console.error('Query:', sql);
        console.error('Params:', params);
        throw error;
    }
};

/**
 * Get a client for transactions
 * Since SQLite is single-file, we mock the client but support transactions via SQL
 */
const getClient = async () => {
    // In SQLite, we don't 'connect' separately, but we can utilize the maindb
    // For compatibility with PG transaction pattern: 
    // client.query('BEGIN') -> client.query('COMMIT')
    // We reuse the main query function wrapped in an object

    return {
        query: query,
        release: () => { } // No-op for SQLite
    };
};

/**
 * Close database connection
 */
const closePool = async () => {
    if (db) {
        db.close();
        console.log('✓ SQLite database closed');
    }
};

module.exports = {
    query,
    getClient,
    pool: { query }, // Mock pool for server.js
    closePool,
    db // Export raw db instance for advanced usage (search.js)
};
