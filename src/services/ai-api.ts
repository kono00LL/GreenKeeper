import { isAxiosError } from 'axios';
import { apiClient } from '@/services/http';

export type PlantAdviceResponse = { answer: string; model: string | null };

export async function askPlantAdvice(plantId: string, question: string): Promise<PlantAdviceResponse> {
  const response = await apiClient.post<PlantAdviceResponse>('/ai/plant-advice', { plantId, question }, { timeout: 40_000 });
  return response.data;
}

export function plantAdviceErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const code = error.response?.data?.error?.code;
    if (error.response?.status === 401) return '登录后才能使用 AI 养护助手';
    if (code === 'AI_NOT_CONFIGURED') return 'AI 养护助手尚未配置';
    if (error.response?.status === 429 || code === 'AI_RATE_LIMITED') return 'AI 请求较多，请稍后再试';
    if (error.response?.status === 504 || code === 'AI_TIMEOUT') return 'AI 响应超时，请重试';
    if (error.response?.status === 502 || error.response?.status === 503) return 'AI 服务暂时不可用，请稍后重试';
  }
  return 'AI 养护建议获取失败，请检查网络后重试';
}
