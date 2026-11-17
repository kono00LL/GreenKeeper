import {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { logDiagnostic } from '@/services/diagnostics';
import { apiClient, refreshClient, API_BASE_URL } from '@/services/http-transport';

type AuthRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  sessionVersion?: number;
  skipAuthRefresh?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

apiClient.interceptors.request.use((config) => {
  const { accessToken, sessionVersion } = useAuthStore.getState();
  (config as AuthRequestConfig).sessionVersion = sessionVersion;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if ((response.config as AuthRequestConfig).sessionVersion !== useAuthStore.getState().sessionVersion) {
      return Promise.reject(new Error('Session changed'));
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as AuthRequestConfig | undefined;
    if (config && config.sessionVersion !== useAuthStore.getState().sessionVersion) return Promise.reject(error);
    const shouldRefresh =
      error.response?.status === 401 &&
      Boolean(config) &&
      !config?._retry &&
      !config?.skipAuthRefresh &&
      Boolean(useAuthStore.getState().refreshToken);

    if (!shouldRefresh || !config) {
      if (error.code !== 'ERR_CANCELED') logDiagnostic('[api] request failed', error);
      return Promise.reject(error);
    }

    config._retry = true;
    if (!refreshPromise) {
      refreshPromise = useAuthStore.getState().refreshSession().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (!refreshed || config.sessionVersion !== useAuthStore.getState().sessionVersion) {
      if (error.code !== 'ERR_CANCELED') logDiagnostic('[api] request failed', error);
      return Promise.reject(error);
    }

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      logDiagnostic('[api] request failed', error);
      return Promise.reject(error);
    }

    config.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient(config);
  },
);

export function withoutAuthRefresh(config: AxiosRequestConfig = {}) {
  return { ...config, skipAuthRefresh: true } as AxiosRequestConfig;
}

export { apiClient, refreshClient, API_BASE_URL };
