import { createPostStore } from '@/store/post-state';
import type { Post, PostPage } from '@/types/post';
const post = (id = 'a', collected = false): Post => ({
  id,
  title: id,
  excerpt: '摘要',
  content: '正文',
  coverImage: null,
  category: 'article',
  images: [],
  createdAt: '2026-01-01',
  collected,
  collectionCount: collected ? 1 : 0,
});
const page = (items = [post()], current = 1, totalPages = 2): PostPage => ({
  items,
  page: current,
  pageSize: 10,
  total: 20,
  totalPages,
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((r, j) => {
    resolve = r;
    reject = j;
  });
  return { resolve, reject, promise };
}
function setup() {
  const api = {
    list: jest.fn().mockResolvedValue(page()),
    detail: jest.fn().mockResolvedValue(post()),
    collect: jest.fn().mockResolvedValue({ post_id: 'a', collected: true, collectionCount: 1 }),
  };
  return { api, store: createPostStore(api) };
}
test('locks pagination, deduplicates, and does not advance after failure', async () => {
  const { api, store } = setup();
  await store.getState().loadFeed();
  const next = deferred<PostPage>();
  api.list.mockReturnValueOnce(next.promise);
  const pending = store.getState().loadMore();
  await store.getState().loadMore();
  expect(api.list).toHaveBeenCalledTimes(2);
  next.reject(new Error('offline'));
  await pending;
  expect(store.getState().feed.page).toBe(1);
  expect(store.getState().feed.moreError).toBeTruthy();
  api.list.mockResolvedValueOnce(page([post(), post('b')], 2));
  await store.getState().loadMore();
  expect(api.list).toHaveBeenLastCalledWith(2);
  expect(store.getState().feed.ids).toEqual(['a', 'b']);
  expect(store.getState().feed.hasMore).toBe(false);
});
test('refresh invalidates old pagination and preserves content on refresh failure', async () => {
  const { api, store } = setup();
  await store.getState().loadFeed();
  const old = deferred<PostPage>();
  api.list.mockReturnValueOnce(old.promise);
  const pending = store.getState().loadMore();
  api.list.mockResolvedValueOnce(page([post('fresh')]));
  await store.getState().loadFeed(true);
  old.resolve(page([post('stale')], 2));
  await pending;
  expect(store.getState().feed.ids).toEqual(['fresh']);
  api.list.mockRejectedValueOnce(new Error('offline'));
  await store.getState().loadFeed(true);
  expect(store.getState().feed.ids).toEqual(['fresh']);
  expect(store.getState().feed.error).toBeTruthy();
});
test('collection is confirmed by server and old reads cannot overwrite it', async () => {
  const { api, store } = setup();
  await store.getState().loadFeed();
  const old = deferred<Post>();
  api.detail.mockReturnValueOnce(old.promise);
  const reading = store.getState().loadDetail('a');
  const write = deferred<{ post_id: string; collected: boolean; collectionCount: number }>();
  api.collect.mockReturnValueOnce(write.promise);
  const collecting = store.getState().toggleCollection('a');
  await store.getState().toggleCollection('a');
  expect(api.collect).toHaveBeenCalledTimes(1);
  expect(store.getState().entities.a.collected).toBe(false);
  write.resolve({ post_id: 'a', collected: true, collectionCount: 3 });
  await collecting;
  old.resolve(post());
  await reading;
  expect(store.getState().entities.a.collected).toBe(true);
  expect(store.getState().entities.a.collectionCount).toBe(3);
});
test('account switch clears personal state and ignores old reads and writes', async () => {
  const { api, store } = setup();
  api.list.mockResolvedValueOnce(page([post('a', true)]));
  await store.getState().loadFeed();
  const old = deferred<Post>();
  api.detail.mockReturnValueOnce(old.promise);
  const reading = store.getState().loadDetail('a');
  const write = deferred<{ post_id: string; collected: boolean; collectionCount: number }>();
  api.collect.mockReturnValueOnce(write.promise);
  const collecting = store.getState().toggleCollection('a');
  store.getState().resetSession();
  expect(store.getState().entities.a.collected).toBe(false);
  old.resolve(post('a', true));
  write.resolve({ post_id: 'a', collected: true, collectionCount: 8 });
  await Promise.all([reading, collecting]);
  expect(store.getState().entities.a.collected).toBe(false);
  expect(store.getState().collections.a).toBeUndefined();
});
test('uncertain write reconciles from server; failed reconciliation retries the same intent', async () => {
  const { api, store } = setup();
  await store.getState().loadFeed();
  api.collect.mockRejectedValueOnce(new Error('timeout'));
  api.detail.mockResolvedValueOnce(post('a', true));
  await store.getState().toggleCollection('a');
  expect(store.getState().entities.a.collected).toBe(true);
  api.collect.mockRejectedValueOnce(new Error('timeout'));
  api.detail.mockRejectedValueOnce(new Error('offline'));
  await store.getState().toggleCollection('a');
  expect(store.getState().collections.a.error).toBeTruthy();
  api.collect.mockResolvedValueOnce({ post_id: 'a', collected: false, collectionCount: 0 });
  await store.getState().toggleCollection('a');
  expect(api.collect).toHaveBeenLastCalledWith('a', false);
});
test('detail cancellation ignores late responses and 404 removes stale content', async () => {
  const { api, store } = setup();
  await store.getState().loadFeed();
  const old = deferred<Post>();
  api.detail.mockReturnValueOnce(old.promise);
  const pending = store.getState().loadDetail('a');
  store.getState().cancelDetail('a');
  old.resolve(post('a', true));
  await pending;
  expect(store.getState().entities.a.collected).toBe(false);
  api.detail.mockRejectedValueOnce({ response: { status: 404 } });
  await store.getState().loadDetail('a');
  expect(store.getState().details.a.status).toBe('missing');
  expect(store.getState().entities.a).toBeUndefined();
});
