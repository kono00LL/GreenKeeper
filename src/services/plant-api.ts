import { apiClient } from '@/services/http';
import type { PlantCategory, PlantDetail, PlantSummary } from '@/types/plant';

export const plantApi = {
  categories: async () =>
    (await apiClient.get<{ categories: PlantCategory[] }>('/plants/categories')).data.categories,
  list: async (category: string) =>
    (await apiClient.get<{ items: PlantSummary[] }>('/plants', { params: { category } })).data.items,
  detail: async (id: string) =>
    (await apiClient.get<{ plant: PlantDetail }>(`/plants/${encodeURIComponent(id)}`)).data.plant,
};
