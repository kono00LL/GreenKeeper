import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { CameraCaptureScreen } from '@/components/camera/camera-capture-screen';
import { CameraPreviewScreen } from '@/components/camera/camera-preview-screen';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/services/image-upload';

jest.mock('@/services/image-upload', () => ({
  ...jest.requireActual('@/services/image-upload'),
  uploadImage: jest.fn(),
}));

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

test('upload stays pending without duplicate requests, then shows the server image', async () => {
  let finish!: (value: unknown) => void;
  (uploadImage as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '上传图片' }));
  fireEvent.press(screen.getByRole('button', { name: '上传图片' }));
  expect(uploadImage).toHaveBeenCalledTimes(1);
  finish({ url: 'http://localhost:8080/uploads/saved.jpg' });
  expect(await screen.findByText('上传成功')).toBeTruthy();
  expect(screen.getByLabelText('已上传的图片').props.source).toEqual([{ uri: 'http://localhost:8080/uploads/saved.jpg' }]);
});

test('upload failure keeps the original image and supports a manual retry', async () => {
  (uploadImage as jest.Mock).mockRejectedValueOnce({ isAxiosError: true, response: { status: 413, data: { error: { code: 'IMAGE_TOO_LARGE' } } } });
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '上传图片' }));
  expect(await screen.findByText('图片不能超过 10 MiB，请重新选择图片')).toBeTruthy();
  expect(screen.getByLabelText('已选择的图片')).toBeTruthy();
  (uploadImage as jest.Mock).mockResolvedValueOnce({ url: 'http://localhost:8080/uploads/saved.jpg' });
  fireEvent.press(screen.getByRole('button', { name: '上传图片' }));
  expect(await screen.findByText('上传成功')).toBeTruthy();
});

test('failure to load the saved server image offers a display retry without uploading again', async () => {
  (uploadImage as jest.Mock).mockResolvedValueOnce({ url: 'http://localhost:8080/uploads/saved.jpg' });
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '上传图片' }));
  const image = await screen.findByLabelText('已上传的图片');
  fireEvent(image, 'error', { nativeEvent: { error: 'offline' } });
  expect(await screen.findByText('图片已上传，服务器图片加载失败')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '重新加载图片' }));
  expect(uploadImage).toHaveBeenCalledTimes(1);
});

test('leaving the preview cancels the pending upload and avoids state updates', async () => {
  let finish!: (value: unknown) => void;
  let signal!: AbortSignal;
  (uploadImage as jest.Mock).mockImplementation((_uri, requestSignal) => {
    signal = requestSignal;
    return new Promise((resolve) => { finish = resolve; });
  });
  const view = render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '上传图片' }));
  view.unmount();
  expect(signal.aborted).toBe(true);
  finish({ url: 'http://localhost:8080/uploads/saved.jpg' });
});
