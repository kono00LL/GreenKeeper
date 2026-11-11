import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AuthPage from '@/app/auth';
import { router, useLocalSearchParams } from 'expo-router';
import { authReturnTarget } from '@/navigation/auth-return';
import { login, loginWithWeChat, requestEmailCode, resetPassword, verifyEmailCode } from '@/services/auth-api';
import { Platform } from 'react-native';
import * as WeChat from 'react-native-wechat-lib';
jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@/services/auth-api', () => ({ login: jest.fn(), loginWithWeChat: jest.fn(), register: jest.fn(), requestEmailCode: jest.fn(), resetPassword: jest.fn(), verifyEmailCode: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'state-123') }));
jest.mock('react-native-wechat-lib', () => ({ registerApp: jest.fn(), isWXAppInstalled: jest.fn(), sendAuthRequest: jest.fn() }));
jest.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ setSession: jest.fn() }),
}));
beforeEach(() => jest.clearAllMocks());
test('allows returning to the garden after login', () => {
  expect(authReturnTarget('/garden')).toEqual({ pathname: '/(tabs)/garden' });
  expect(authReturnTarget('/garden/reminders')).toEqual({ pathname: '/garden/reminders' });
  expect(authReturnTarget('/garden/reminders/new?instanceId=instance-123')).toEqual({ pathname: '/garden/reminders/new', params: { instanceId: 'instance-123' } });
  expect(authReturnTarget('/garden/reminders/reminder-123')).toEqual({ pathname: '/garden/reminders/[reminderId]', params: { reminderId: 'reminder-123' } });
  expect(authReturnTarget('/plants/plant-123')).toEqual({ pathname: '/plants/[id]', params: { id: 'plant-123' } });
  expect(authReturnTarget('/plants/https://untrusted.example')).toBeNull();
  expect(authReturnTarget('/(tabs)/garden')).toBeNull();
});
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
  await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledWith('user@example.com', '123456'));
  expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/posts/[post-id]', params: { 'post-id': 'a' } });
});

test('shows the third-party WeChat login entry instead of a nickname field', () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  render(<AuthPage />);

  expect(screen.getByText('第三方登录')).toBeTruthy();
  expect(screen.getByRole('button', { name: '使用微信登录' })).toBeTruthy();
  expect(screen.queryByText('昵称（可选）')).toBeNull();
});

test('exchanges a validated WeChat login code and saves the returned session', async () => {
  const originalPlatform = Platform.OS;
  const originalAppId = process.env.EXPO_PUBLIC_WECHAT_APP_ID;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  process.env.EXPO_PUBLIC_WECHAT_APP_ID = 'wx-test-app';
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  (WeChat.registerApp as jest.Mock).mockResolvedValue(true);
  (WeChat.isWXAppInstalled as jest.Mock).mockResolvedValue(true);
  (WeChat.sendAuthRequest as jest.Mock).mockResolvedValue({ code: 'wx-code', state: 'state-123' });
  (loginWithWeChat as jest.Mock).mockResolvedValue({ user: {}, access_token: 'a', refresh_token: 'r' });
  render(<AuthPage />);

  fireEvent.press(screen.getByRole('button', { name: '使用微信登录' }));

  await waitFor(() => expect(loginWithWeChat).toHaveBeenCalledWith('wx-code'));
  expect(WeChat.sendAuthRequest).toHaveBeenCalledWith('snsapi_userinfo', 'state-123');
  expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  if (originalAppId === undefined) delete process.env.EXPO_PUBLIC_WECHAT_APP_ID;
  else process.env.EXPO_PUBLIC_WECHAT_APP_ID = originalAppId;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
});

test('does not send an authorization code when WeChat returns a mismatched state', async () => {
  const originalPlatform = Platform.OS;
  const originalAppId = process.env.EXPO_PUBLIC_WECHAT_APP_ID;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  process.env.EXPO_PUBLIC_WECHAT_APP_ID = 'wx-test-app';
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  (WeChat.registerApp as jest.Mock).mockResolvedValue(true);
  (WeChat.isWXAppInstalled as jest.Mock).mockResolvedValue(true);
  (WeChat.sendAuthRequest as jest.Mock).mockResolvedValue({ code: 'wx-code', state: 'wrong-state' });
  render(<AuthPage />);

  fireEvent.press(screen.getByRole('button', { name: '使用微信登录' }));

  expect(await screen.findByText('微信授权验证失败，请重试')).toBeTruthy();
  expect(loginWithWeChat).not.toHaveBeenCalled();
  if (originalAppId === undefined) delete process.env.EXPO_PUBLIC_WECHAT_APP_ID;
  else process.env.EXPO_PUBLIC_WECHAT_APP_ID = originalAppId;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
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
