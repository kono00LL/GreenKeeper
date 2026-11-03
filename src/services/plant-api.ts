import { apiClient, API_BASE_URL } from '@/services/http';
import type { PlantCategory, PlantDetail, PlantSummary } from '@/types/plant';

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
};
