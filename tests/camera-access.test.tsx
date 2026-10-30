import React from 'react';
import { render, screen } from '@testing-library/react-native';
import CameraPage from '@/app/(tabs)/camera';
import PreviewPage from '@/app/camera-preview';
import { useAuthStore } from '@/store/auth-store';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: { params: { returnTo: string } } }) => {
    const { Text } = require('react-native');
    return <Text>{`login:${href.params.returnTo}`}</Text>;
  },
}));
jest.mock('@/components/camera/camera-capture-screen', () => ({
  CameraCaptureScreen: () => {
    const { Text } = require('react-native');
    return <Text>live-camera-mounted</Text>;
  },
}));
jest.mock('@/components/camera/camera-preview-screen', () => ({
  CameraPreviewScreen: () => {
    const { Text } = require('react-native');
    return <Text>preview-mounted</Text>;
  },
}));

beforeEach(() => useAuthStore.getState().clearSession());

test.each([CameraPage, PreviewPage])('guest route redirects without mounting protected content', (Page) => {
  render(<Page />);
  expect(screen.getByText('login:/camera')).toBeTruthy();
  expect(screen.queryByText('live-camera-mounted')).toBeNull();
  expect(screen.queryByText('preview-mounted')).toBeNull();
});

test('authenticated camera unmounts when the session is cleared', () => {
  useAuthStore.getState().setSession({ user_id: 'u' } as never, 'access', 'refresh');
  const { act } = require('@testing-library/react-native');
  render(<CameraPage />);
  expect(screen.getByText('live-camera-mounted')).toBeTruthy();
  act(() => useAuthStore.getState().clearSession());
  expect(screen.queryByText('live-camera-mounted')).toBeNull();
  expect(screen.getByText('login:/camera')).toBeTruthy();
});
