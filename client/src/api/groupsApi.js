import apiClient from './apiClient';

export const groupsApi = {
    getGroups: async (params = {}) => {
        const response = await apiClient.get('/groups', { params });
        return response.data;
    },

    createGroup: async (data) => {
        const response = await apiClient.post('/groups', data);
        return response.data;
    },

    getGroupById: async (id) => {
        const response = await apiClient.get(`/groups/${id}`);
        return response.data;
    },

    addMember: async (groupId, userId, role = 'member') => {
        const response = await apiClient.post(`/groups/${groupId}/members`, { userId, role });
        return response.data;
    },

    removeMember: async (groupId, userId) => {
        const response = await apiClient.delete(`/groups/${groupId}/members/${userId}`);
        return response.data;
    },

    joinGroup: async (groupId) => {
        const response = await apiClient.post(`/groups/${groupId}/join`);
        return response.data;
    }
};
