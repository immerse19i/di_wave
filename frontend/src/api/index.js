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
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      const code = error.response.data?.code;

      if (code === 'SESSION_EXPIRED') {
        // 동시접속 감지: 알림 후 로그아웃
        alert('다른 기기에서 로그인하여 현재 세션이 종료되었습니다.');
        localStorage.removeItem('token');
        const isAdmin = window.location.pathname.startsWith('/admin');
        window.location.href = isAdmin ? '/admin/login' : '/login';
        return Promise.reject(error);
      }

      // 일반 토큰 만료
      localStorage.removeItem('token');
      const isAdmin = window.location.pathname.startsWith('/admin');
      window.location.href = isAdmin ? '/admin/login' : '/login';
    }
    return Promise.reject(error);
  }
)

export default api;