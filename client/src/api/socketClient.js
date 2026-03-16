import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

/**
 * Connect to the socket server and register the current user.
 */
export function connectSocket() {
    if (socket && socket.connected) return socket;

    const token = localStorage.getItem('accessToken');

    socket = io(SOCKET_URL, {
        auth: { token },
        withCredentials: true,
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        // Tell the server which user this socket belongs to
        const userId = getUserIdFromToken(token);
        if (userId) {
            socket.emit('registerUser', userId);
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
        console.warn('Socket connection error:', err.message);
    });

    return socket;
}

/**
 * Disconnect & cleanup the socket.
 */
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/**
 * Get the shared socket instance (connect first if needed).
 */
export function getSocket() {
    return socket;
}

/**
 * Decode user ID from the JWT stored in localStorage.
 */
function getUserIdFromToken(token) {
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id || null;
    } catch {
        return null;
    }
}
