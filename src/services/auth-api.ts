import type { AuthResponse, AuthTokens, User, UserResponse } from '@/types/auth';
import { apiClient, refreshClient, withoutAuthRefresh } from '@/services/http';

export async function register(
  email: string,
  password: string,
  userName?: string,
  avatarUrl?: string,
): Promise<AuthResponse> {
  const response = await refreshClient.post<AuthResponse>('/user/register', {
    email,
    password,
    ...(userName ? { user_name: userName } : {}),
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  });
  return response.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await refreshClient.post<AuthResponse>(
    '/user/login',
    { email, password },
    withoutAuthRefresh(),
  );
  return response.data;
}

export async function getCurrentUser(skipAuthRefresh = false): Promise<User> {
  const response = await apiClient.get<UserResponse>('/user/userinfo', skipAuthRefresh ? withoutAuthRefresh() : undefined);
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
