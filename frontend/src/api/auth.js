import api from './index';

export const authAPI = {
  login: (loginId, password) => api.post('/auth/login', { loginId, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.put('/auth/password', { currentPassword, newPassword }),
  checkId: (loginId) => api.post('/auth/check-id', { loginId }),
  checkEmail: (email) => api.post('/auth/check-email', { email }),

  sendCode: (data) => api.post('/auth/send-code', data),
  verifyCode: (data) => api.post('/auth/verify-code', data),
  register: (formData) => api.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  findId: (email, ceoName) => api.post('/auth/find-id', { email, ceoName }),
  findPassword: (loginId, email) => api.post('/auth/find-password', { loginId, email }),
  resetPassword: (loginId, email, newPassword) => api.post('/auth/reset-password', { loginId, email, newPassword }),
verifyPassword: (currentPassword) => api.post('/auth/verify-password', { currentPassword }),
postponePassword: () => api.post('/auth/postpone-password'),
updateProfile: (data) => api.put('/auth/profile', data),
getRejectedInfo: () => api.get('/auth/rejected-info'),
reapply: (formData) => api.put('/auth/reapply', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}),
}



