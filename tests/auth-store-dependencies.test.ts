// Session initialization must not load clients that import the store back.
jest.mock('@/services/auth-api', () => {
  throw new Error('Auth store must not import the UI auth API');
});
jest.mock('@/services/http', () => {
  throw new Error('Auth store must not import the authenticated HTTP client');
});

import { useAuthStore } from '@/store/auth-store';
import { refreshClient } from '@/services/http-transport';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import type { User } from '@/types/auth';

const user = { user_id: 'a' } as User;

afterEach(() => {
  useAuthStore.getState().clearSession();
  delete refreshClient.defaults.adapter;
});

test('refreshes tokens and reads the profile without loading a client that depends on the store', async () => {
  const calls: Array<{ url?: string; authorization: unknown }> = [];
  refreshClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push({ url: config.url, authorization: config.headers.Authorization });
    expect(config.headers.get('X-Request-ID')).toMatch(/^[A-Za-z0-9-]{8,80}$/);
    return {
      data: config.url === '/user/refresh'
        ? { access_token: 'fresh-access', refresh_token: 'fresh-refresh' }
        : { user },
      status: 200, statusText: 'OK', headers: new AxiosHeaders(), config,
    };
  };
  useAuthStore.getState().setSession(user, 'old-access', 'old-refresh');

  expect(await useAuthStore.getState().refreshSession()).toBe(true);
  expect(calls).toEqual([
    { url: '/user/refresh', authorization: 'Bearer old-refresh' },
    { url: '/user/userinfo', authorization: 'Bearer fresh-access' },
  ]);
  expect(useAuthStore.getState()).toMatchObject({
    user, status: 'authenticated', accessToken: 'fresh-access', refreshToken: 'fresh-refresh',
  });
});
