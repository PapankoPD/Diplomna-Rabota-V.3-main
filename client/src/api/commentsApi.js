import apiClient from './apiClient';

export const commentsApi = {
    getComments: async (materialId, params = {}) => {
        const response = await apiClient.get(`/comments/material/${materialId}`, { params });
        return response.data;
    },

    createComment: async (materialId, content, parentId = null) => {
        const response = await apiClient.post(`/comments/${materialId}`, { content, parentId });
        return response.data;
    },

    updateComment: async (commentId, content) => {
        const response = await apiClient.put(`/comments/${commentId}`, { content });
        return response.data;
    },

    deleteComment: async (commentId) => {
        const response = await apiClient.delete(`/comments/${commentId}`);
        return response.data;
    },

    moderateComment: async (commentId, status) => {
        const response = await apiClient.patch(`/comments/${commentId}/moderate`, { status });
        return response.data;
    },

    getHistory: async (commentId) => {
        const response = await apiClient.get(`/comments/${commentId}/history`);
        return response.data;
    }
};
