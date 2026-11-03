import { plantApi } from '@/services/plant-api';
import { apiClient } from '@/services/http';

jest.mock('@/services/http', () => ({
  API_BASE_URL: 'http://localhost:8080',
  apiClient: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

test('resolves relative cover URLs on lists, preserving missing covers', async () => {
  (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { items: [
    { id: 'one', coverImage: { url: '/uploads/fern.webp', altText: '蕨类' } },
    { id: 'two', coverImage: null },
  ] } });
  const plants = await plantApi.list('ferns');
  expect(plants[0].coverImage?.url).toBe('http://localhost:8080/uploads/fern.webp');
  expect(plants[1].coverImage).toBeNull();
  expect(apiClient.get).toHaveBeenCalledWith('/plants', { params: { category: 'ferns' } });
});

test('resolves detail URLs without changing attribution or absolute URLs', async () => {
  const image = { url: 'https://example.com/fern.webp', altText: null, sourceName: 'Self', attribution: '作者', license: 'CC0' };
  (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { plant: { id: 'one', coverImage: image } } });
  expect((await plantApi.detail('one')).coverImage).toEqual(image);
});

test('resolves category cover URLs and preserves their source plant and credits', async () => {
  (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { categories: [
    { id: 'ferns', coverPlantId: 'fern', coverImage: { url: '/uploads/fern.webp', altText: '蕨类', attribution: '作者', license: 'CC BY-SA 4.0' } },
    { id: 'cacti', coverPlantId: null, coverImage: null },
  ] } });
  const categories = await plantApi.categories();
  expect(categories[0].coverImage?.url).toBe('http://localhost:8080/uploads/fern.webp');
  expect(categories[0].coverPlantId).toBe('fern');
  expect(categories[0].coverImage?.attribution).toBe('作者');
  expect(categories[1].coverImage).toBeNull();
});
