require('dotenv').config();
const app = require('./app');
const { pool, closePool } = require('./config/database');

const PORT = process.env.PORT || 3000;

let server;

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await pool.query('SELECT 1');
        console.log('✓ Database connection verified');

        // Start HTTP server
        server = app.listen(PORT, () => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`✓ Server running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ API available at: http://localhost:${PORT}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\nAvailable endpoints:');
            console.log('  GET  /health');
            console.log('  POST /api/auth/register');
            console.log('  POST /api/auth/login');
            console.log('  POST /api/auth/refresh');
            console.log('  POST /api/auth/logout');
            console.log('  GET  /api/auth/me');
            console.log('  GET  /api/users');
            console.log('  GET  /api/roles');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
const shutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    if (server) {
        server.close(async () => {
            console.log('✓ HTTP server closed');

            await closePool();

            console.log('✓ Graceful shutdown complete');
            process.exit(0);
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    } else {
        await closePool();
        process.exit(0);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
