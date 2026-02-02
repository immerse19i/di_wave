import axios from 'axios';

const api = axios.create({
  baseURL : 'http://localhost:3000/api',
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
      // 로그인 페이지로
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
)

export default api;