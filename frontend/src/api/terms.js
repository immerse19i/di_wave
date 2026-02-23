import api from './index';

export const termsAPI = {
  // === 유저단 ===
  // 공개 약관 목록
  getPublicTerms: () => api.get('/terms/public'),

  // PDF 파일 URL (iframe용)
  getFileUrl: (id) => `${import.meta.env.VITE_API_URL}/terms/${id}/file`,

  // === 관리자단 ===
  // 전체 약관 목록 (현재 버전)
  getAdminTerms: () => api.get('/terms/admin'),

  // 약관 이름 수정
  updateName: (id, name) => api.put(`/terms/admin/${id}/name`, { name }),

  // PDF 파일 업로드
  uploadFile: (type, formData) => api.post(`/terms/admin/${type}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // 공개/비공개 토글
  togglePublic: (id) => api.put(`/terms/admin/${id}/toggle`),

  // 이전약관 이력 조회
  getHistory: (type) => api.get(`/terms/admin/${type}/history`),
};
