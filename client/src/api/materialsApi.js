import apiClient from './apiClient';

export const materialsApi = {
    getMaterials: async (params = {}) => {
        const response = await apiClient.get('/materials', { params });
        return response.data;
    },

    getMaterialById: async (id) => {
        const response = await apiClient.get(`/materials/${id}`);
        return response.data;
    },

    uploadMaterial: async (formData, onUploadProgress) => {
        const response = await apiClient.post('/materials', formData, {
            onUploadProgress,
        });
        return response.data;
    },

    uploadMultipleMaterials: async (formData, onUploadProgress) => {
        const response = await apiClient.post('/materials/batch', formData, {
            onUploadProgress,
        });
        return response.data;
    },

    updateMaterial: async (id, data) => {
        const response = await apiClient.put(`/materials/${id}`, data);
        return response.data;
    },

    deleteMaterial: async (id) => {
        const response = await apiClient.delete(`/materials/${id}`);
        return response.data;
    },

    downloadMaterial: async (id) => {
        const response = await apiClient.get(`/materials/${id}/download`, {
            responseType: 'blob',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
        });
        return response;
    },

    getCategories: async () => {
        const response = await apiClient.get('/materials/categories/all');
        return response.data;
    },

    getVersions: async (id) => {
        const response = await apiClient.get(`/materials/${id}/versions`);
        return response.data;
    },

    restoreVersion: async (id, versionId) => {
        const response = await apiClient.post(`/materials/${id}/versions/${versionId}/restore`);
        return response.data;
    },

    deleteVersion: async (id, versionId) => {
        const response = await apiClient.delete(`/materials/${id}/versions/${versionId}`);
        return response.data;
    },
};
