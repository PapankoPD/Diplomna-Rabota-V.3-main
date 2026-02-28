import apiClient from './apiClient';

export const searchApi = {
    globalSearch: async (query, limit = 10) => {
        const response = await apiClient.get('/search', { params: { q: query, limit } });
        return response.data;
    },

    searchMaterials: async (params) => {
        const response = await apiClient.get('/search/materials', { params });
        return response.data;
    },

    searchTopics: async (query, params = {}) => {
        const response = await apiClient.get('/search/topics', { params: { q: query, ...params } });
        return response.data;
    },

    searchSubjects: async (query, limit = 10) => {
        const response = await apiClient.get('/search/subjects', { params: { q: query, limit } });
        return response.data;
    },

    getAutocomplete: async (query, limit = 5) => {
        const response = await apiClient.get('/search/autocomplete', { params: { q: query, limit } });
        return response.data;
    }
};
