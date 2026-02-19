import api from './index';

export const analysisAPI = {
    // 분석 요청 (multipart/form-data)
    create: (formData) => api.post('/analyses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
    }),

    // 분석 목록 조회
    // 2026.02.19 검색/정렬 파라미터 추가
        getList: (params = {}) => api.get('/analyses', {
        params: {
            page: params.page || 1,
            limit: params.limit || 20,
            search: params.search || '',
            sortField: params.sortField || '',
            sortOrder: params.sortOrder || '',
        }
    }),

    // 분석 상세 조회
    getDetail: (id) => api.get(`/analyses/${id}`),
};
