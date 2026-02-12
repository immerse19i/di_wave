import api from './index';

export const analysisAPI = {
    // 분석 요청 (multipart/form-data)
    create: (formData) => api.post('/analyses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
    }),

    // 분석 목록 조회
    getList: (page = 1, limit = 20) => api.get('/analyses', { params: { page, limit } }),

    // 분석 상세 조회
    getDetail: (id) => api.get(`/analyses/${id}`),
};
