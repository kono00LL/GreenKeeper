import { refreshClient } from '@/services/http-transport';
import type { AuthTokens, User, UserResponse } from '@/types/auth';

// Tokens are explicit here: refreshing a session must not import the store's HTTP interceptors.
export async function getSessionUser(accessToken: string): Promise<User> {
  const response = await refreshClient.get<UserResponse>('/user/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data.user;
}

export async function refreshSession(refreshToken: string): Promise<AuthTokens> {
  const response = await refreshClient.get<AuthTokens>('/user/refresh', {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });
  return response.data;
}

export async function logout(token: string): Promise<void> {
  await refreshClient.post('/user/logout', null, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
