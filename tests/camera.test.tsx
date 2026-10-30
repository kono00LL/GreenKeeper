import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraCaptureScreen } from '@/components/camera/camera-capture-screen';
import { CameraPreviewScreen } from '@/components/camera/camera-preview-screen';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/services/image-upload';
import { identifyPlant } from '@/services/plant-identification-api';
import { useAuthStore } from '@/store/auth-store';

jest.mock('@/services/plant-identification-api', () => ({
  ...jest.requireActual('@/services/plant-identification-api'),
  identifyPlant: jest.fn(),
}));

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
  (useLocalSearchParams as jest.Mock).mockReturnValue({ uri: 'file:///plant.jpg' });
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

const identification = { bestMatch: 'Ajuga genevensis L.', candidates: [
  { scientificName: 'Ajuga genevensis L.', commonNames: ['筋骨草'], score: 0.91 },
  { scientificName: 'Ajuga orientalis L.', commonNames: [], score: 0.04 },
] };

test('identification shows ordered candidates with common names, scientific names and matching scores', async () => {
  (identifyPlant as jest.Mock).mockResolvedValueOnce(identification);
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  expect(await screen.findByText('筋骨草')).toBeTruthy();
  expect(screen.getByText('Ajuga genevensis L.')).toBeTruthy();
  expect(screen.getByText('Ajuga orientalis L.')).toBeTruthy();
  expect(screen.getByText('匹配分数 0.910')).toBeTruthy();
  expect(screen.getByRole('link', { name: '识别由 Pl@ntNet 提供' })).toBeTruthy();
  expect(screen.getByLabelText('Pl@ntNet Logo')).toBeTruthy();
  expect(uploadImage).not.toHaveBeenCalled();
});

test('identification is single-flight and blocks upload until finished', async () => {
  let finish!: (value: unknown) => void;
  (identifyPlant as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  fireEvent.press(screen.getByRole('button', { name: '上传图片' }));
  expect(screen.getByText('正在识别植物…')).toBeTruthy();
  expect(identifyPlant).toHaveBeenCalledTimes(1);
  expect(uploadImage).not.toHaveBeenCalled();
  await act(async () => finish(identification));
});

test('upload also blocks identification', async () => {
  let finish!: (value: unknown) => void;
  (uploadImage as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '上传图片' }));
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  expect(identifyPlant).not.toHaveBeenCalled();
  await act(async () => finish({ url: 'http://localhost:8080/uploads/saved.jpg' }));
});

test('an empty identification offers a new photograph without hiding the selected photo', async () => {
  (identifyPlant as jest.Mock).mockResolvedValueOnce({ bestMatch: null, candidates: [] });
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  expect(await screen.findByText('未找到匹配植物，请换个角度重新拍摄')).toBeTruthy();
  expect(screen.getByLabelText('已选择的图片')).toBeTruthy();
});

test('an identification error allows manual retry without automatically consuming another request', async () => {
  (identifyPlant as jest.Mock).mockRejectedValueOnce({ isAxiosError: true, response: { status: 429 } });
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  expect(await screen.findByText('识别额度已用完或请求过于频繁，请稍后再试')).toBeTruthy();
  expect(identifyPlant).toHaveBeenCalledTimes(1);
  (identifyPlant as jest.Mock).mockResolvedValueOnce(identification);
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  expect(await screen.findByText('筋骨草')).toBeTruthy();
});

test('leaving the preview cancels identification', async () => {
  let finish!: (value: unknown) => void;
  let signal!: AbortSignal;
  (identifyPlant as jest.Mock).mockImplementationOnce((_uri, requestSignal) => {
    signal = requestSignal;
    return new Promise((resolve) => { finish = resolve; });
  });
  const view = render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(identification));
});

test('a session change clears existing results and cancels pending identification', async () => {
  (identifyPlant as jest.Mock).mockResolvedValueOnce(identification);
  render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  expect(await screen.findByText('筋骨草')).toBeTruthy();
  act(() => useAuthStore.getState().clearSession());
  expect(screen.queryByText('筋骨草')).toBeNull();
  let finish!: (value: unknown) => void;
  let signal!: AbortSignal;
  (identifyPlant as jest.Mock).mockImplementationOnce((_uri, requestSignal) => {
    signal = requestSignal;
    return new Promise((resolve) => { finish = resolve; });
  });
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  act(() => useAuthStore.getState().clearSession());
  expect(signal.aborted).toBe(true);
  await act(async () => finish(identification));
  expect(screen.queryByText('筋骨草')).toBeNull();
});

test('selecting a different photo clears candidates', async () => {
  (identifyPlant as jest.Mock).mockResolvedValueOnce(identification);
  const view = render(<CameraPreviewScreen />);
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  expect(await screen.findByText('筋骨草')).toBeTruthy();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ uri: 'file:///other.jpg' });
  view.rerender(<CameraPreviewScreen />);
  expect(screen.queryByText('筋骨草')).toBeNull();
});
