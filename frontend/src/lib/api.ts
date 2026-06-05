import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Injeta o JWT do backend (armazenado no localStorage após o callback OAuth).
 * O token é gerado pelo NestJS e armazenado em /auth/callback após o redirect.
 */
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('api_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Token inválido ou expirado — limpa e redireciona para login
        localStorage.removeItem('api_token');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
