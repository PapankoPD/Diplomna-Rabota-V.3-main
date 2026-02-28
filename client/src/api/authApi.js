import apiClient from './apiClient';

export const authApi = {
    login: async (email, password) => {
        const response = await apiClient.post('/auth/login', { email, password });
        return response.data;
    },

    register: async (email, username, password) => {
        const response = await apiClient.post('/auth/register', { email, username, password });
        return response.data;
    },

    logout: async (refreshToken) => {
        const response = await apiClient.post('/auth/logout', { refreshToken });
        return response.data;
    },

    refreshToken: async (refreshToken) => {
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await apiClient.put('/auth/profile', data);
        return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
        const response = await apiClient.put('/auth/password', { currentPassword, newPassword });
        return response.data;
    },
};

