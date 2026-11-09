import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AuthPage from '@/app/auth';
import { router, useLocalSearchParams } from 'expo-router';
import { login, requestEmailCode, resetPassword, verifyEmailCode } from '@/services/auth-api';
jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@/services/auth-api', () => ({ login: jest.fn(), register: jest.fn(), requestEmailCode: jest.fn(), resetPassword: jest.fn(), verifyEmailCode: jest.fn() }));
jest.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ setSession: jest.fn() }),
}));
beforeEach(() => jest.clearAllMocks());
test('camera login returns to capture while skipping returns home', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/camera' });
  (login as jest.Mock).mockResolvedValue({ user: {}, access_token: 'a', refresh_token: 'r' });
  render(<AuthPage />);
  fireEvent.press(screen.getByText('跳过'));
  expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)');
  jest.clearAllMocks();
  fireEvent.press(screen.getByText('密码登录'));
  fireEvent.changeText(screen.getByPlaceholderText('name@example.com'), 'user@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('至少 8 个字符'), 'password123');
  fireEvent.press(screen.getByRole('button', { name: '登录' }));
  await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/(tabs)/camera' }));
});
test('login returns to the original detail without automatically collecting', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/posts/a' });
  (login as jest.Mock).mockResolvedValue({
    user: { user_id: 'u' },
    access_token: 'a',
    refresh_token: 'r',
  });
  render(<AuthPage />);
  fireEvent.press(screen.getByText('密码登录'));
  fireEvent.changeText(screen.getByPlaceholderText('name@example.com'), 'user@example.com');
  fireEvent.changeText(screen.getByPlaceholderText('至少 8 个字符'), 'password123');
  fireEvent.press(screen.getByRole('button', { name: '登录' }));
  await waitFor(() =>
    expect(router.dismissTo).toHaveBeenCalledWith({
      pathname: '/posts/[post-id]',
      params: { 'post-id': 'a' },
    }),
  );
});

test('email code login requests a code and returns to the original page after verification', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/posts/a' });
  (requestEmailCode as jest.Mock).mockResolvedValue(undefined);
  (verifyEmailCode as jest.Mock).mockResolvedValue({ user: {}, access_token: 'a', refresh_token: 'r' });
  render(<AuthPage />);
  fireEvent.changeText(screen.getByPlaceholderText('name@example.com'), 'user@example.com');
  fireEvent.press(screen.getByText('发送验证码'));
  await waitFor(() => expect(requestEmailCode).toHaveBeenCalledWith('user@example.com', 'login'));
  expect(await screen.findByText('重新发送（60 秒）')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText('输入 6 位验证码'), '123456');
  fireEvent.press(screen.getByRole('button', { name: '登录' }));
  await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledWith('user@example.com', '123456', ''));
  expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/posts/[post-id]', params: { 'post-id': 'a' } });
});

test('password reset requests a purpose-specific code and returns to password login', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  (requestEmailCode as jest.Mock).mockResolvedValue(undefined);
  (resetPassword as jest.Mock).mockResolvedValue(undefined);
  render(<AuthPage />);
  fireEvent.press(screen.getByText('密码登录'));
  fireEvent.press(screen.getByText('忘记密码？'));
  fireEvent.changeText(screen.getByPlaceholderText('name@example.com'), 'user@example.com');
  fireEvent.press(screen.getByText('发送重设验证码'));
  await waitFor(() => expect(requestEmailCode).toHaveBeenCalledWith('user@example.com', 'password_reset'));
  fireEvent.changeText(screen.getByPlaceholderText('输入 6 位验证码'), '123456');
  fireEvent.changeText(screen.getByPlaceholderText('至少 8 个字符'), 'newpassword123');
  fireEvent.changeText(screen.getByPlaceholderText('再次输入新密码'), 'newpassword123');
  fireEvent.press(screen.getByRole('button', { name: '重设密码' }));
  await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('user@example.com', '123456', 'newpassword123'));
  expect(await screen.findByText('密码已重设，请使用新密码登录。')).toBeTruthy();
});
test('cancel returns to community and rejects arbitrary return URLs', () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/post' });
  const view = render(<AuthPage />);
  fireEvent.press(screen.getByText('跳过'));
  expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/(tabs)/post' });
  view.unmount();
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: 'https://untrusted.example/' });
  render(<AuthPage />);
  fireEvent.press(screen.getByText('跳过'));
  expect(router.dismissTo).not.toHaveBeenCalled();
  expect(router.back).toHaveBeenCalled();
});
