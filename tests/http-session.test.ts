import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/services/http';
import { useAuthStore } from '@/store/auth-store';
jest.mock('@/store/auth-store', () => ({ useAuthStore: { getState: jest.fn() } }));
function response(config: InternalAxiosRequestConfig) {
  return { data: { ok: true }, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config };
}
test('concurrent expired requests share one refresh and retry with fresh credentials', async () => {
  const state = {
    sessionVersion: 1,
    accessToken: 'expired',
    refreshToken: 'refresh',
    refreshSession: jest.fn(async () => {
      state.accessToken = 'fresh';
      return true;
    }),
  };
  (useAuthStore.getState as jest.Mock).mockImplementation(() => state);
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
    if (config.headers.Authorization === 'Bearer expired')
      throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, {
        ...response(config),
        status: 401,
      });
    return response(config);
  });
  const results = await Promise.all([
    apiClient.get('/posts', { adapter }),
    apiClient.get('/posts/a', { adapter }),
  ]);
  expect(results.every((result) => result.status === 200)).toBe(true);
  expect(state.refreshSession).toHaveBeenCalledTimes(1);
  expect(adapter).toHaveBeenCalledTimes(4);
});
test('a response from a previous login is rejected before reaching consumers', async () => {
  const state = { sessionVersion: 1, accessToken: 'old', refreshToken: 'refresh' };
  (useAuthStore.getState as jest.Mock).mockImplementation(() => state);
  const adapter = async (config: InternalAxiosRequestConfig) => {
    state.sessionVersion++;
    return response(config);
  };
  await expect(apiClient.get('/posts', { adapter })).rejects.toThrow('Session changed');
});

test('adds a request id to API calls without exposing credentials in diagnostic logs', async () => {
  const state = { sessionVersion: 1, accessToken: 'private-access-token', refreshToken: null };
  (useAuthStore.getState as jest.Mock).mockImplementation(() => state);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
    expect(config.headers.get('X-Request-ID')).toMatch(/^[A-Za-z0-9-]{8,80}$/);
    throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
      ...response(config), status: 500,
      headers: new AxiosHeaders({ 'X-Request-ID': config.headers.get('X-Request-ID') }),
      data: { error: { code: 'INTERNAL_ERROR' }, secret: 'private-response-marker' },
    });
  });

  await expect(apiClient.get('/private?query=private-query-marker', { adapter })).rejects.toThrow('Request failed');

  const logged = JSON.stringify(errorSpy.mock.calls);
  expect(logged).toContain('GET');
  expect(logged).toContain('/private');
  expect(logged).toContain('INTERNAL_ERROR');
  expect(logged).not.toContain('private-access-token');
  expect(logged).not.toContain('private-response-marker');
  expect(logged).not.toContain('private-query-marker');
});

test('does not log intentionally canceled API requests', async () => {
  (useAuthStore.getState as jest.Mock).mockReturnValue({ sessionVersion: 1, accessToken: null, refreshToken: null });
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  errorSpy.mockClear();
  const adapter = async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('canceled', 'ERR_CANCELED', config);
  };

  await expect(apiClient.get('/posts', { adapter })).rejects.toMatchObject({ code: 'ERR_CANCELED' });

  expect(errorSpy).not.toHaveBeenCalled();
});

test.each([['/images', 30_000], ['/plant-identifications', 40_000]])('multipart %s keeps its file body, auth headers and timeout across token refresh', async (url, timeout) => {
  const state = {
    sessionVersion: 1, accessToken: 'expired', refreshToken: 'refresh',
    refreshSession: jest.fn(async () => { state.accessToken = 'fresh'; return true; }),
  };
  (useAuthStore.getState as jest.Mock).mockImplementation(() => state);
  const data = new FormData();
  data.append('image', { uri: 'file:///plant.jpg', name: 'plant.jpg', type: 'image/jpeg' } as unknown as Blob);
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
    expect(config.data).toBe(data);
    expect(config.headers.getContentType()).not.toBe('application/json');
    expect(config.timeout).toBe(timeout);
    if (config.headers.Authorization === 'Bearer expired') {
      throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined, { ...response(config), status: 401 });
    }
    expect(config.headers.Authorization).toBe('Bearer fresh');
    return response(config);
  });
  await apiClient.post(url, data, { headers: { 'Content-Type': undefined }, timeout, adapter });
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(state.refreshSession).toHaveBeenCalledTimes(1);
});
