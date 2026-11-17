import { create, AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { createRequestId, logDiagnostic } from '@/services/diagnostics';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// Transport has no session dependency, so the auth store can use it while initializing.
function createClient() {
  const client = create({
    baseURL: API_BASE_URL,
    timeout: 10_000,
    headers: { 'Content-Type': 'application/json' },
  });
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const headers = AxiosHeaders.from(config.headers);
    if (!headers.get('X-Request-ID')) headers.set('X-Request-ID', createRequestId());
    config.headers = headers;
    return config;
  });
  return client;
}

export const apiClient = createClient();
export const refreshClient = createClient();

refreshClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code !== 'ERR_CANCELED') logDiagnostic('[api] request failed', error);
    return Promise.reject(error);
  },
);
