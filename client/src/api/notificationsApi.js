import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with credentials
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const notificationsApi = {
    // Get notifications natively matching our Express pagination style
    getNotifications: async (params = { page: 1, limit: 10 }) => {
        const response = await api.get('/notifications', { params });
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread-count');
        return response.data;
    },

    markAsRead: async (id) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await api.put('/notifications/read-all');
        return response.data;
    },

    deleteNotification: async (id) => {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    }
};
