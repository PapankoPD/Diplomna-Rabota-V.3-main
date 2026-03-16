import apiClient from './apiClient';

export const notificationsApi = {
    // Get notifications natively matching our Express pagination style
    getNotifications: async (params = { page: 1, limit: 10 }) => {
        const response = await apiClient.get('/notifications', { params });
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await apiClient.get('/notifications/unread-count');
        return response.data;
    },

    markAsRead: async (id) => {
        const response = await apiClient.put(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await apiClient.put('/notifications/read-all');
        return response.data;
    },

    deleteNotification: async (id) => {
        const response = await apiClient.delete(`/notifications/${id}`);
        return response.data;
    }
};
