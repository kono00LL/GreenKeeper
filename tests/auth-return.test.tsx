import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AuthPage from '@/app/auth';
import { router, useLocalSearchParams } from 'expo-router';
import { login } from '@/services/auth-api';
jest.mock('expo-router', () => ({
  router: {
    dismissTo: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@/services/auth-api', () => ({ login: jest.fn(), register: jest.fn() }));
jest.mock('@/store/auth-store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ setSession: jest.fn() }),
}));
beforeEach(() => jest.clearAllMocks());
test('login returns to the original detail without automatically collecting', async () => {
  (useLocalSearchParams as jest.Mock).mockReturnValue({ returnTo: '/posts/a' });
  (login as jest.Mock).mockResolvedValue({
    user: { user_id: 'u' },
    access_token: 'a',
    refresh_token: 'r',
  });
  render(<AuthPage />);
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
