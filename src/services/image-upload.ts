import { Image, Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { API_BASE_URL, apiClient } from '@/services/http';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/store/auth-store';

export const MAX_IMAGE_SIDE = 1600;

export type UploadedImage = {
  key: string;
  url: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
};

export async function prepareImage(uri: string) {
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (imageWidth, imageHeight) => resolve({ width: imageWidth, height: imageHeight }), reject);
  });
  const context = ImageManipulator.manipulate(uri);
  try {
    if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
      context.resize(width >= height ? { width: MAX_IMAGE_SIDE } : { height: MAX_IMAGE_SIDE });
    }
    const image = await context.renderAsync();
    try {
      return await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

export async function prepareImageForm(uri: string, signal?: AbortSignal): Promise<FormData> {
  const sessionVersion = useAuthStore.getState().sessionVersion;
  const prepared = await prepareImage(uri);
  if (signal?.aborted) throw new Error('Upload canceled');
  if (sessionVersion !== useAuthStore.getState().sessionVersion) throw new Error('Session changed');
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(prepared.uri, { signal })).blob();
    formData.append('image', blob, 'plant.jpg');
  } else {
    formData.append('image', {
      uri: prepared.uri,
      name: 'plant.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
  }
  if (sessionVersion !== useAuthStore.getState().sessionVersion) throw new Error('Session changed');
  if (signal?.aborted) throw new Error('Upload canceled');
  return formData;
}

export async function uploadImage(uri: string, signal?: AbortSignal): Promise<UploadedImage> {
  const formData = await prepareImageForm(uri, signal);
  const response = await apiClient.post<{ image: UploadedImage }>('/images', formData, {
    headers: { 'Content-Type': undefined },
    timeout: 30_000,
    signal,
  });
  return {
    ...response.data.image,
    url: new URL(response.data.image.url, API_BASE_URL).toString(),
  };
}

export function imageUploadErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) return '登录已失效，请重新登录';
    if (error.response?.status === 413) return '图片不能超过 10 MiB，请重新选择图片';
    if (error.response?.status === 415) return '仅支持 JPEG、PNG 和 WebP 图片，请重新选择';
    if (error.response?.status === 400) return '图片内容无效或已损坏，请重新选择';
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return '上传超时，请重试';
    if (error.response?.status === 500) return '图片保存失败，请稍后重试';
  }
  return '图片处理或上传失败，请检查图片和网络后重试';
}
