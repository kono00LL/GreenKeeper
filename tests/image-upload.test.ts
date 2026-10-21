import { Image, Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { apiClient } from '@/services/http';
import { prepareImage, uploadImage } from '@/services/image-upload';

const mockResize = jest.fn();
const mockSave = jest.fn(async () => ({ uri: 'file:///compressed.jpg', width: 1600, height: 800 }));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn(() => ({
    resize: mockResize,
    renderAsync: async () => ({ saveAsync: mockSave, release: jest.fn() }),
    release: jest.fn(),
  })) },
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('@/services/http', () => ({
  API_BASE_URL: 'http://localhost:8080',
  apiClient: { post: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Image, 'getSize');
  (Image.getSize as jest.Mock).mockImplementation((_uri, success) => success(3200, 1600));
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { image: {
    key: 'key.jpg', url: '/uploads/key.jpg', mimeType: 'image/jpeg', size: 1200, width: 1600, height: 800,
  } } });
});

test('resizes a landscape image by its long side and saves JPEG at quality 0.8', async () => {
  await prepareImage('file:///large.jpg');
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///large.jpg');
  expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
  expect(mockSave).toHaveBeenCalledWith({
    format: SaveFormat.JPEG,
    compress: 0.8,
  });
});

test('resizes portrait images by height and never upscales smaller images', async () => {
  (Image.getSize as jest.Mock).mockImplementationOnce((_uri, success) => success(1200, 2400));
  await prepareImage('file:///portrait.jpg');
  expect(mockResize).toHaveBeenLastCalledWith({ height: 1600 });
  mockResize.mockClear();
  (Image.getSize as jest.Mock).mockImplementationOnce((_uri, success) => success(800, 600));
  await prepareImage('file:///small.jpg');
  expect(mockResize).not.toHaveBeenCalled();
});

test('uploads one compressed multipart image and resolves returned relative URL', async () => {
  const result = await uploadImage('file:///large.jpg');
  const [url, body, config] = (apiClient.post as jest.Mock).mock.calls[0];
  expect(url).toBe('/images');
  expect(body).toBeInstanceOf(FormData);
  expect(config).toMatchObject({ headers: { 'Content-Type': undefined }, timeout: 30_000 });
  expect(result.url).toBe('http://localhost:8080/uploads/key.jpg');
});

test('Web uploads a JPEG Blob rather than a native file descriptor', async () => {
  const originalOS = Platform.OS;
  const originalFetch = globalThis.fetch;
  const blob = new Blob(['image'], { type: 'image/jpeg' });
  const append = jest.spyOn(FormData.prototype, 'append');
  try {
    Platform.OS = 'web';
    globalThis.fetch = jest.fn(async () => ({ blob: async () => blob })) as unknown as typeof fetch;
    await uploadImage('file:///large.jpg');
    expect(append).toHaveBeenCalledWith('image', blob, 'plant.jpg');
  } finally {
    Platform.OS = originalOS;
    globalThis.fetch = originalFetch;
    append.mockRestore();
  }
});

test('does not send a request when local image preparation fails', async () => {
  (Image.getSize as jest.Mock).mockImplementationOnce((_uri, _success, error) => error(new Error('invalid image')));
  await expect(uploadImage('file:///broken.jpg')).rejects.toThrow('invalid image');
  expect(apiClient.post).not.toHaveBeenCalled();
});

test('canceling during compression prevents the subsequent upload', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(uploadImage('file:///large.jpg', controller.signal)).rejects.toThrow('Upload canceled');
  expect(apiClient.post).not.toHaveBeenCalled();
});
