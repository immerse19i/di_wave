import api from './index';

export const authAPI = {
  login: (loginId, password) => api.post('/auth/login', { loginId, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.put('/auth/password', { currentPassword, newPassword }),
  checkId: (loginId) => api.post('/auth/check-id', { loginId }),
  sendCode: (data) => api.post('/auth/send-code', data),
  verifyCode: (data) => api.post('/auth/verify-code', data),
  register: (formData) => api.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}


