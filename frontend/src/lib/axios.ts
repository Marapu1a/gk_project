import axios from 'axios';
import { getServerErrorMessage } from '@/utils/uiMessages';
import { expireCurrentSession } from '@/features/auth/utils/authSession';

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

function isPublicAuthRequest(url?: string) {
  if (!url) return false;
  return PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
}

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

    if (
      error?.response?.status === 401 &&
      localStorage.getItem('token') &&
      !isPublicAuthRequest(error?.config?.url)
    ) {
      expireCurrentSession();
    }

    return Promise.reject(error);
  },
);
