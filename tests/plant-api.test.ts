import { plantApi } from '@/services/plant-api';
import { apiClient } from '@/services/http';

jest.mock('@/services/http', () => ({
  API_BASE_URL: 'http://localhost:8080',
  apiClient: { get: jest.fn(), put: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn() },
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

test('loads personal plants and adds/removes them through authenticated endpoints', async () => {
  (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { items: [
    { id: 'fern', instanceId: 'instance-1', createdAt: '2026-11-10T00:00:00.000Z', coverImage: { url: '/uploads/fern.webp', altText: '铁线蕨' } },
  ] } });
  (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: { plant: {
    id: 'fern', instanceId: 'instance-2', createdAt: '2026-11-10T00:00:01.000Z', coverImage: { url: '/uploads/fern.webp', altText: '铁线蕨' },
  } } });
  (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: { removed: true } });

  const mine = await plantApi.mine();
  expect(mine[0].coverImage?.url).toBe('http://localhost:8080/uploads/fern.webp');
  expect(mine[0].instanceId).toBe('instance-1');
  expect(mine[0].createdAt).toBe('2026-11-10T00:00:00.000Z');
  expect(apiClient.get).toHaveBeenCalledWith('/me/plants');
  expect((await plantApi.addMine('fern/one')).instanceId).toBe('instance-2');
  expect(apiClient.put).toHaveBeenCalledWith('/me/plants/fern%2Fone');
  expect(await plantApi.removeMine('instance/one')).toEqual({ removed: true });
  expect(apiClient.delete).toHaveBeenCalledWith('/me/plants/instance%2Fone');
});

test('renames one plant instance through its instance endpoint', async () => {
  (apiClient.patch as jest.Mock).mockResolvedValueOnce({ data: { plant: {
    id: 'fern', instanceId: 'instance/one', createdAt: '2026-11-10T00:00:00.000Z', customName: '阳台铁线蕨', coverImage: null,
  } } });
  const plant = await plantApi.renameMine('instance/one', '阳台铁线蕨');
  expect(plant.instanceId).toBe('instance/one');
  expect(plant.customName).toBe('阳台铁线蕨');
  expect(apiClient.patch).toHaveBeenCalledWith('/me/plants/instance%2Fone', { customName: '阳台铁线蕨' });
});
