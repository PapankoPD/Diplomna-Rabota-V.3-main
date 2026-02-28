import apiClient from './apiClient';

export const rolesApi = {
    getRoles: async () => {
        const response = await apiClient.get('/roles');
        return response.data;
    },

    getRoleById: async (id) => {
        const response = await apiClient.get(`/roles/${id}`);
        return response.data;
    },

    getPermissions: async () => {
        const response = await apiClient.get('/roles/permissions/all');
        return response.data;
    },

    createRole: async (name, description) => {
        const response = await apiClient.post('/roles', { name, description });
        return response.data;
    },

    updateRolePermissions: async (id, permissionIds) => {
        const response = await apiClient.put(`/roles/${id}/permissions`, { permissionIds });
        return response.data;
    },

    deleteRole: async (id) => {
        const response = await apiClient.delete(`/roles/${id}`);
        return response.data;
    },
};
