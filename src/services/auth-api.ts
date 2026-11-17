import type { AuthResponse, Gender, User, UserResponse } from '@/types/auth';
import { apiClient, refreshClient, withoutAuthRefresh } from '@/services/http';

export { refreshSession, logout } from '@/services/auth-session-api';

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

export async function loginWithWeChat(code: string): Promise<AuthResponse> {
  const response = await refreshClient.post<AuthResponse>('/auth/wechat/android', { code }, withoutAuthRefresh());
  return response.data;
}

export async function requestEmailCode(email: string, purpose: 'login' | 'password_reset'): Promise<void> {
  await refreshClient.post('/auth/email-code', { email, purpose }, withoutAuthRefresh());
}

export async function verifyEmailCode(email: string, code: string, userName?: string): Promise<AuthResponse> {
  const response = await refreshClient.post<AuthResponse>(
    '/auth/email-code/verify',
    { email, code, ...(userName?.trim() ? { user_name: userName.trim() } : {}) },
    withoutAuthRefresh(),
  );
  return response.data;
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await refreshClient.post('/auth/password/reset', { email, code, newPassword }, withoutAuthRefresh());
}

export async function getCurrentUser(skipAuthRefresh = false): Promise<User> {
  const response = await apiClient.get<UserResponse>('/user/userinfo', skipAuthRefresh ? withoutAuthRefresh() : undefined);
  return response.data.user;
}

export async function updateCurrentUser(updates: { user_name?: string; gender?: Gender }): Promise<User> {
  const response = await apiClient.put<UserResponse>('/user/userinfo', updates);
  return response.data.user;
}
