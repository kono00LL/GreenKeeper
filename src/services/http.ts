import {
  create,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/store/auth-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

type AuthRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

export const apiClient = create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

export const refreshClient = create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<boolean> | null = null;

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as AuthRequestConfig | undefined;
    const shouldRefresh =
      error.response?.status === 401 &&
      Boolean(config) &&
      !config?._retry &&
      !config?.skipAuthRefresh &&
      Boolean(useAuthStore.getState().refreshToken);

    if (!shouldRefresh || !config) {
      return Promise.reject(error);
    }

    config._retry = true;
    if (!refreshPromise) {
      refreshPromise = useAuthStore.getState().refreshSession().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (!refreshed) {
      return Promise.reject(error);
    }

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      return Promise.reject(error);
    }

    config.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient(config);
  },
);

export function withoutAuthRefresh(config: AxiosRequestConfig = {}) {
  return { ...config, skipAuthRefresh: true } as AxiosRequestConfig;
}

export { API_BASE_URL };
