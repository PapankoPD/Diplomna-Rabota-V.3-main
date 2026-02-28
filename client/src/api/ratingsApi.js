import apiClient from './apiClient';

export const ratingsApi = {
    rateMaterial: async (materialId, rating) => {
        const response = await apiClient.post(`/ratings/${materialId}`, { rating });
        return response.data;
    },

    deleteRating: async (materialId) => {
        const response = await apiClient.delete(`/ratings/${materialId}`);
        return response.data;
    },

    getUserRating: async (materialId) => {
        const response = await apiClient.get(`/ratings/${materialId}/user`);
        return response.data;
    },
};
