import { apiClient, API_BASE_URL } from '@/services/http';
import type { MyPlant, PlantCategory, PlantDetail, PlantSummary } from '@/types/plant';

function resolveImageUrl<T extends { coverImage: PlantSummary['coverImage'] }>(plant: T): T {
  if (!plant.coverImage) return plant;
  return {
    ...plant,
    coverImage: { ...plant.coverImage, url: new URL(plant.coverImage.url, API_BASE_URL).toString() },
  };
}

export const plantApi = {
  categories: async () =>
    (await apiClient.get<{ categories: PlantCategory[] }>('/plants/categories')).data.categories.map(resolveImageUrl),
  list: async (category: string) =>
    (await apiClient.get<{ items: PlantSummary[] }>('/plants', { params: { category } })).data.items.map(resolveImageUrl),
  detail: async (id: string) =>
    resolveImageUrl((await apiClient.get<{ plant: PlantDetail }>(`/plants/${encodeURIComponent(id)}`)).data.plant),
  mine: async () =>
    (await apiClient.get<{ items: MyPlant[] }>('/me/plants')).data.items.map(resolveImageUrl),
  addMine: async (id: string) =>
    resolveImageUrl((await apiClient.put<{ plant: MyPlant }>(`/me/plants/${encodeURIComponent(id)}`)).data.plant),
  renameMine: async (instanceId: string, customName: string) =>
    resolveImageUrl((await apiClient.patch<{ plant: MyPlant }>(`/me/plants/${encodeURIComponent(instanceId)}`, { customName })).data.plant),
  removeMine: async (instanceId: string) =>
    (await apiClient.delete<{ removed: boolean }>(`/me/plants/${encodeURIComponent(instanceId)}`)).data,
};
