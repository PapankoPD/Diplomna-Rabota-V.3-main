import apiClient from './apiClient';

export const recommendationsApi = {
    getRecommendations: async (limit = 10) => {
        const response = await apiClient.get('/recommendations', { params: { limit } });
        return response.data;
    },

    getPersonalized: async (limit = 10) => {
        const response = await apiClient.get('/recommendations/personalized', { params: { limit } });
        return response.data;
    },

    getTrending: async (limit = 10, filters = {}) => {
        const response = await apiClient.get('/recommendations/trending', { params: { limit, ...filters } });
        return response.data;
    },

    getPopular: async (limit = 10, filters = {}) => {
        const response = await apiClient.get('/recommendations/popular', { params: { limit, ...filters } });
        return response.data;
    },

    getSimilar: async (materialId, limit = 5) => {
        const response = await apiClient.get(`/recommendations/similar/${materialId}`, { params: { limit } });
        return response.data;
    },

    getForYou: async (contextType, contextId, limit = 10) => {
        const response = await apiClient.get('/recommendations/for-you', {
            params: { contextType, contextId, limit }
        });
        return response.data;
    }
};
