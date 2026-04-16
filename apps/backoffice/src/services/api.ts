import axios from 'axios';

const api = axios.create({
  baseURL: '/v1/restaurant',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taula_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('taula_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  },
);

export default api;
