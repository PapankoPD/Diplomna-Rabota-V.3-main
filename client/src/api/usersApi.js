import apiClient from './apiClient';

export const usersApi = {
    getUsers: async (params = {}) => {
        const response = await apiClient.get('/users', { params });
        return response.data;
    },

    getUserById: async (id) => {
        const response = await apiClient.get(`/users/${id}`);
        return response.data;
    },

    updateUserRoles: async (id, roleIds) => {
        const response = await apiClient.put(`/users/${id}/roles`, { roleIds });
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await apiClient.delete(`/users/${id}`);
        return response.data;
    },
};
