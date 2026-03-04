import apiClient from './apiClient';

export const classesApi = {
    getClasses: async () => {
        const res = await apiClient.get('/classes');
        return res.data;
    },
    getTeachers: async () => {
        const res = await apiClient.get('/classes/teachers');
        return res.data;
    },
    assignTeacher: async (classId, teacherId) => {
        const res = await apiClient.post(`/classes/${classId}/assign`, { teacherId });
        return res.data;
    },
    removeTeacher: async (classId) => {
        const res = await apiClient.delete(`/classes/${classId}/assign`);
        return res.data;
    },
    enrollStudent: async (classId, userId) => {
        const res = await apiClient.post(`/classes/${classId}/enroll`, { userId });
        return res.data;
    },
    unenrollStudent: async (classId, userId) => {
        const res = await apiClient.delete(`/classes/${classId}/enroll/${userId}`);
        return res.data;
    },
    getClassStudents: async (classId) => {
        const res = await apiClient.get(`/classes/${classId}/students`);
        return res.data;
    },
};
