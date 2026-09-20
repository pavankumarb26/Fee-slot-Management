import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://fee-slot-management.onrender.com/api';
const cleanApiUrl = rawApiUrl.replace(/\/+$/, '');
const baseURL = cleanApiUrl.endsWith('/api') ? cleanApiUrl : `${cleanApiUrl}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      if (window.location.pathname.startsWith('/staff')) {
        window.location.href = '/staff/login';
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;