import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { CameraCaptureScreen } from '@/components/camera/camera-capture-screen';
import { CameraPreviewScreen } from '@/components/camera/camera-preview-screen';
import * as ImagePicker from 'expo-image-picker';

let mockInitialCameraPermission: { granted: boolean } | null = { granted: true };
let mockCameraPermissionResult = { granted: true };
let mockPickResult: { canceled: boolean; assets?: { uri: string }[] } = { canceled: true };
const mockRequestCameraPermission = jest.fn();
const mockLaunchImageLibrary = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({ uri: 'file:///plant.jpg' })),
}));

jest.mock('expo-camera', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    CameraView: ReactModule.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
      ReactModule.useImperativeHandle(ref, () => ({
        takePictureAsync: jest.fn(async () => ({ uri: 'file:///captured.jpg' })),
      }));
      return <View testID="camera-view" />;
    }),
    useCameraPermissions: () => {
      const [permission, setPermission] = ReactModule.useState(mockInitialCameraPermission);
      const requestPermission = ReactModule.useCallback(async () => {
        mockRequestCameraPermission();
        setPermission(mockCameraPermissionResult);
        return mockCameraPermissionResult;
      }, [setPermission]);
      return [permission, requestPermission];
    },
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibrary(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockInitialCameraPermission = { granted: true };
  mockCameraPermissionResult = { granted: true };
  mockPickResult = { canceled: true };
  mockLaunchImageLibrary.mockImplementation(async () => mockPickResult);
  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (router.canGoBack as jest.Mock).mockReturnValue(true);
});

test('requests camera permission on entry and shows the live camera when granted', async () => {
  mockInitialCameraPermission = null;
  render(<CameraCaptureScreen />);

  expect(await screen.findByTestId('camera-view')).toBeTruthy();
  expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);
});

test('shows a retry action when camera permission is denied', async () => {
  mockInitialCameraPermission = null;
  mockCameraPermissionResult = { granted: false };
  render(<CameraCaptureScreen />);

  expect(await screen.findByText('需要相机权限才能拍摄')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '重新授权相机' }));
  expect(mockRequestCameraPermission).toHaveBeenCalledTimes(2);
});

test('leaves capture open when the gallery picker is canceled', async () => {
  render(<CameraCaptureScreen />);

  fireEvent.press(screen.getByRole('button', { name: '图册' }));

  await waitFor(() => expect(mockLaunchImageLibrary).toHaveBeenCalled());
  expect(router.push).not.toHaveBeenCalled();
  expect(screen.getByTestId('camera-view')).toBeTruthy();
});

test('explains denied gallery access and does not open the picker', async () => {
  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
  render(<CameraCaptureScreen />);

  fireEvent.press(screen.getByRole('button', { name: '图册' }));

  expect(await screen.findByText('需要图库权限才能选择图片')).toBeTruthy();
  expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
});

test('opens the image preview after selecting one gallery image', async () => {
  mockPickResult = { canceled: false, assets: [{ uri: 'file:///selected.jpg' }] };
  render(<CameraCaptureScreen />);

  fireEvent.press(screen.getByRole('button', { name: '图册' }));

  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/camera-preview',
      params: { uri: 'file:///selected.jpg' },
    }),
  );
  expect(mockLaunchImageLibrary).toHaveBeenCalledWith({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  });
});

test('captures a photo and opens the image preview', async () => {
  render(<CameraCaptureScreen />);

  fireEvent.press(screen.getByRole('button', { name: '拍照' }));

  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/camera-preview',
      params: { uri: 'file:///captured.jpg' },
    }),
  );
});

test('shows the selected local image and provides return and reselect actions', () => {
  render(<CameraPreviewScreen />);

  expect(screen.getByLabelText('已选择的图片')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '返回拍摄' }));
  expect(router.back).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: '重新选择' }));
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/camera');
});
