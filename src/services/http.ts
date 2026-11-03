import {
  create,
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/store/auth-store';
import { createRequestId, logDiagnostic } from '@/services/diagnostics';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

type AuthRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  sessionVersion?: number;
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

function addRequestDiagnostics(config: InternalAxiosRequestConfig) {
  const headers = AxiosHeaders.from(config.headers);
  if (!headers.get('X-Request-ID')) headers.set('X-Request-ID', createRequestId());
  config.headers = headers;
  return config;
}

apiClient.interceptors.request.use((config) => {
  const { accessToken, sessionVersion } = useAuthStore.getState();
  (config as AuthRequestConfig).sessionVersion = sessionVersion;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return addRequestDiagnostics(config);
});

refreshClient.interceptors.request.use(addRequestDiagnostics);

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

refreshClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code !== 'ERR_CANCELED') logDiagnostic('[api] request failed', error);
    return Promise.reject(error);
  },
);

export function withoutAuthRefresh(config: AxiosRequestConfig = {}) {
  return { ...config, skipAuthRefresh: true } as AxiosRequestConfig;
}

export { API_BASE_URL };
