import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import ProfilePage from '@/app/(tabs)/profile';
import { useAuthStore } from '@/store/auth-store';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().clearSession();
});

test('opens the collection route for signed-in users and auth for guests', () => {
  const guest = render(<ProfilePage />);
  fireEvent.press(screen.getByText('我的收藏'));
  expect(router.push).toHaveBeenCalledWith('/auth');
  guest.unmount();

  useAuthStore.getState().setSession({ user_id: 'user-1' } as never, 'access', 'refresh');
  render(<ProfilePage />);
  fireEvent.press(screen.getByText('我的收藏'));
  expect(router.push).toHaveBeenLastCalledWith('/collections');
});
