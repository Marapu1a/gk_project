import axios from 'axios';
import { getServerErrorMessage } from '@/utils/uiMessages';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    if (data && typeof data.error === 'string') {
      const originalError = data.error;
      data.errorCode = data.errorCode ?? originalError;
      data.error = getServerErrorMessage(originalError) ?? originalError;
    }

    return Promise.reject(error);
  },
);
