import api from './index';

export const authAPI = {
  login : (loginId, password)=> api.post('/auth/login', {loginId,password}),
  logout: ()=> api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword)=> api.put('/auth/password', {currentPassword, newPassword}),
}