import type { AxiosRequestConfig } from 'axios';
import { apiClient, refreshClient } from '@/services/http';
import { statusOf } from '@/services/post-errors';
import { useAuthStore } from '@/store/auth-store';
import type { CollectionCategory, Post, PostApi, PostPage, CollectionResult } from '@/types/post';

async function publicGet<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  try {
    return (await apiClient.get<T>(path, config)).data;
  } catch (error) {
    // apiClient already attempted token refresh. Guest reads never carry Authorization.
    if (statusOf(error) === 401 && !useAuthStore.getState().accessToken) {
      return (await refreshClient.get<T>(path, config)).data;
    }
    throw error;
  }
}
export const postApi: PostApi = {
  list: (page) => publicGet<PostPage>('/posts', { params: { page, pageSize: 10 } }),
  detail: async (id) => (await publicGet<{ post: Post }>(`/posts/${encodeURIComponent(id)}`)).post,
  collect: async (id, collected) =>
    (
      await apiClient.put<CollectionResult>(`/posts/${encodeURIComponent(id)}/collection`, {
        collected,
      })
    ).data,
};

export async function getCollections(category: CollectionCategory): Promise<Post[]> {
  const response = await apiClient.get<{ items: Post[] }>('/me/collections', {
    params: { category },
  });
  return response.data.items;
}
