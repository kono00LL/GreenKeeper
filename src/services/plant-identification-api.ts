import { isAxiosError } from 'axios';
import { apiClient } from '@/services/http';
import { prepareImageForm } from '@/services/image-upload';
import { useAuthStore } from '@/store/auth-store';
import type { PlantIdentification } from '@/types/plant-identification';

export async function identifyPlant(uri: string, signal?: AbortSignal): Promise<PlantIdentification> {
  const sessionVersion = useAuthStore.getState().sessionVersion;
  const form = await prepareImageForm(uri, signal);
  if (signal?.aborted) throw new Error('Identification canceled');
  if (useAuthStore.getState().sessionVersion !== sessionVersion) throw new Error('Session changed');
  const response = await apiClient.post<PlantIdentification>('/plant-identifications', form, {
    headers: { 'Content-Type': undefined }, timeout: 40_000, signal,
  });
  if (signal?.aborted) throw new Error('Identification canceled');
  if (useAuthStore.getState().sessionVersion !== sessionVersion) throw new Error('Session changed');
  return response.data;
}

export function identificationErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    if (status === 401) return '登录已失效，请重新登录';
    if (status === 413) return '图片不能超过 10 MiB，请重新选择图片';
    if (status === 415) return '识别仅支持 JPEG、PNG 图片，请重新选择';
    if (status === 400) return '图片内容无效，请重新选择一张清晰的植物照片';
    if (status === 429) return '识别额度已用完或请求过于频繁，请稍后再试';
    if (code === 'IDENTIFICATION_NOT_CONFIGURED') return '植物识别功能尚未配置';
    if (code === 'IDENTIFICATION_CONFIGURATION_ERROR') return '植物识别服务配置异常，请联系管理员';
    if (status === 504 || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return '植物识别超时，请重试';
    if (status === 502 || status === 503) return '植物识别服务暂不可用，请稍后重试';
  }
  return '植物识别失败，请检查图片和网络后重试';
}
