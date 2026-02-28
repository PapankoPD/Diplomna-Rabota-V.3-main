import apiClient from './apiClient';

export const taxonomyApi = {
    getSubjects: async (includeStats = false) => {
        const response = await apiClient.get('/taxonomy/subjects', { params: { stats: includeStats } });
        return response.data;
    },

    getTopics: async (subjectCode = null, includeStats = false, parentOnly = false) => {
        const params = { stats: includeStats };
        if (subjectCode) params.subject = subjectCode;
        if (parentOnly) params.parentOnly = true;

        const response = await apiClient.get('/taxonomy/topics', { params });
        return response.data;
    },

    getGrades: async (category = null) => {
        const params = {};
        if (category) params.category = category;

        const response = await apiClient.get('/taxonomy/grades', { params });
        return response.data;
    },

    getHierarchy: async () => {
        const response = await apiClient.get('/taxonomy/hierarchy');
        return response.data;
    },

    createSubject: async (data) => {
        const response = await apiClient.post('/taxonomy/subjects', data);
        return response.data;
    },

    createTopic: async (data) => {
        const response = await apiClient.post('/taxonomy/topics', data);
        return response.data;
    },

    createGrade: async (data) => {
        const response = await apiClient.post('/taxonomy/grades', data);
        return response.data;
    },

    deleteSubject: async (id) => {
        const response = await apiClient.delete(`/taxonomy/subjects/${id}`);
        return response.data;
    },

    deleteTopic: async (id) => {
        const response = await apiClient.delete(`/taxonomy/topics/${id}`);
        return response.data;
    },

    deleteGrade: async (id) => {
        const response = await apiClient.delete(`/taxonomy/grades/${id}`);
        return response.data;
    }
};
