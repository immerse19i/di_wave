import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use((config)=> {
  const token = localStorage.getItem('token');
  if(token) {
    config.headers.Authorization =`Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 - 401

api.interceptors.response.use(
  (response) => response,
  (error)=> {
    if(error.response?.status === 401 && !error.config.url.includes('/auth/login')){
      //토큰 지우고
      localStorage.removeItem('token');
      // 관리자 페이지면 관리자 로그인으로, 아니면 유저 로그인으로
      const isAdmin = window.location.pathname.startsWith('/admin');
      window.location.href = isAdmin ? '/admin/login' : '/login';
    }
    return Promise.reject(error);
  }
)

export default api;