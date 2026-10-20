import { postApi } from '@/services/post-api';
import { apiClient, refreshClient } from '@/services/http';
import { useAuthStore } from '@/store/auth-store';
jest.mock('@/services/http', () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
  refreshClient: { get: jest.fn() },
}));
jest.mock('@/store/auth-store', () => ({ useAuthStore: { getState: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
test('uses existing contracts and retries public reads anonymously only after session is cleared', async () => {
  (useAuthStore.getState as jest.Mock).mockReturnValue({ accessToken: null });
  (apiClient.get as jest.Mock).mockRejectedValueOnce({ response: { status: 401 } });
  (refreshClient.get as jest.Mock).mockResolvedValueOnce({ data: { items: [] } });
  expect(await postApi.list(1)).toEqual({ items: [] });
  expect(refreshClient.get).toHaveBeenCalledWith('/posts', { params: { page: 1, pageSize: 10 } });
  (apiClient.put as jest.Mock).mockResolvedValueOnce({
    data: { post_id: 'a', collected: true, collectionCount: 1 },
  });
  await postApi.collect('a', true);
  expect(apiClient.put).toHaveBeenCalledWith('/posts/a/collection', { collected: true });
});
test('does not downgrade a still-authenticated failure to guest data', async () => {
  (useAuthStore.getState as jest.Mock).mockReturnValue({ accessToken: 'new-account' });
  (apiClient.get as jest.Mock).mockRejectedValueOnce({ response: { status: 401 } });
  await expect(postApi.detail('a')).rejects.toBeTruthy();
  expect(refreshClient.get).not.toHaveBeenCalled();
});
