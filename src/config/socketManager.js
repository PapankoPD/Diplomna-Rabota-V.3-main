const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

// Map of userId -> Set of socket IDs
const connectedUsers = new Map();

/**
 * Initialize Socket.io on the HTTP server
 */
function initializeSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next();
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = String(decoded.userId || decoded.id);
            socket.userId = userId;
        } catch (err) {
            // Token invalid - allow connection but without userId
        }
        next();
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // If JWT was decoded in middleware, register immediately
        if (socket.userId) {
            const uid = String(socket.userId);
            if (!connectedUsers.has(uid)) connectedUsers.set(uid, new Set());
            connectedUsers.get(uid).add(socket.id);
            console.log(`User ${uid} auto-registered via JWT with socket ${socket.id}`);
        }

        // Also allow manual registration (for cases where JWT decode fails)
        socket.on('registerUser', (userId) => {
            if (userId) {
                const uid = String(userId);
                socket.userId = uid;
                if (!connectedUsers.has(uid)) connectedUsers.set(uid, new Set());
                connectedUsers.get(uid).add(socket.id);
                console.log(`User ${uid} registered with socket ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            if (socket.userId) {
                const uid = String(socket.userId);
                if (connectedUsers.has(uid)) {
                    connectedUsers.get(uid).delete(socket.id);
                    if (connectedUsers.get(uid).size === 0) {
                        connectedUsers.delete(uid);
                    }
                }
            }
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    console.log('✓ Socket.io initialized');
    return io;
}

/**
 * Emit a real-time notification to a specific user by ID.
 * If the user is not connected, this is a no-op (notification is still in DB).
 */
function emitNotificationToUser(userId, notification) {
    if (!io) return;

    const userSockets = connectedUsers.get(String(userId));
    if (userSockets && userSockets.size > 0) {
        userSockets.forEach((socketId) => {
            io.to(socketId).emit('new_notification', notification);
        });
    }
}

/**
 * Get the socket.io instance
 */
function getIo() {
    return io;
}

module.exports = { initializeSocket, emitNotificationToUser, getIo };
