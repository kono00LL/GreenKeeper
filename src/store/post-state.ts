import { createStore } from 'zustand/vanilla';
import { postErrorMessage, statusOf } from '@/services/post-errors';
import type { Post, PostApi } from '@/types/post';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error' | 'missing';
type DetailState = { status: LoadStatus; refreshing: boolean; error: string | null };
type CollectionState = { pending: boolean; error: string | null; retryTarget?: boolean };
type FeedState = {
  ids: string[];
  page: number;
  hasMore: boolean;
  status: LoadStatus;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  moreError: string | null;
};
export type PostState = {
  entities: Record<string, Post>;
  feed: FeedState;
  details: Record<string, DetailState>;
  collections: Record<string, CollectionState>;
  resetSession: () => void;
  loadFeed: (refresh?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  cancelDetail: (id: string) => void;
  toggleCollection: (id: string) => Promise<'login' | void>;
};
const initialFeed = (): FeedState => ({
  ids: [],
  page: 0,
  hasMore: true,
  status: 'idle',
  refreshing: false,
  loadingMore: false,
  error: null,
  moreError: null,
});
export const idleDetail: DetailState = { status: 'idle', refreshing: false, error: null };

// Each store owns its request generations, making independent tests and session resets simple.
export function createPostStore(api: PostApi) {
  let session = 0,
    feedRequest = 0;
  const detailRequests: Record<string, number> = {};
  let collectionRevisions: Record<string, number> = {};
  return createStore<PostState>()((set, get) => {
    const merge = (posts: Post[], revisions: Record<string, number>) => {
      const entities = { ...get().entities };
      for (const post of posts) {
        const previous = entities[post.id];
        const protectCollection =
          get().collections[post.id]?.pending ||
          (collectionRevisions[post.id] ?? 0) !== (revisions[post.id] ?? 0);
        entities[post.id] =
          previous && protectCollection
            ? { ...post, collected: previous.collected, collectionCount: previous.collectionCount }
            : post;
      }
      return entities;
    };
    const setDetail = (id: string, detail: DetailState) =>
      set((s) => ({ details: { ...s.details, [id]: detail } }));
    const setCollection = (id: string, value: CollectionState) =>
      set((s) => ({ collections: { ...s.collections, [id]: value } }));
    const removePost = (id: string) =>
      set((s) => {
        const entities = { ...s.entities };
        delete entities[id];
        return {
          entities,
          feed: { ...s.feed, ids: s.feed.ids.filter((value) => value !== id) },
          details: {
            ...s.details,
            [id]: { status: 'missing', refreshing: false, error: '帖子不存在或已删除' },
          },
        };
      });
    return {
      entities: {},
      feed: initialFeed(),
      details: {},
      collections: {},
      resetSession() {
        session++;
        feedRequest++;
        collectionRevisions = {};
        set((s) => ({
          entities: Object.fromEntries(
            Object.entries(s.entities).map(([id, post]) => [id, { ...post, collected: false }]),
          ),
          feed: { ...initialFeed(), ids: s.feed.ids },
          details: {},
          collections: {},
        }));
      },
      async loadFeed(refresh = false) {
        const feed = get().feed;
        if (feed.refreshing || (!refresh && feed.status !== 'idle' && feed.status !== 'error'))
          return;
        const request = ++feedRequest,
          owner = session,
          revisions = { ...collectionRevisions };
        set({
          feed: {
            ...feed,
            status: feed.ids.length ? 'ready' : 'loading',
            refreshing: true,
            loadingMore: false,
            error: null,
            moreError: null,
          },
        });
        try {
          const result = await api.list(1);
          if (owner !== session || request !== feedRequest) return;
          set({
            entities: merge(result.items, revisions),
            feed: {
              ...initialFeed(),
              ids: [...new Set(result.items.map((p) => p.id))],
              page: 1,
              hasMore: result.page < result.totalPages,
              status: 'ready',
            },
          });
        } catch (error) {
          if (owner !== session || request !== feedRequest) return;
          set((s) => ({
            feed: {
              ...s.feed,
              status: s.feed.ids.length ? 'ready' : 'error',
              refreshing: false,
              error: postErrorMessage(error),
            },
          }));
        }
      },
      async loadMore() {
        const feed = get().feed;
        if (
          feed.status !== 'ready' ||
          !feed.hasMore ||
          feed.refreshing ||
          feed.loadingMore ||
          !feed.page
        )
          return;
        const request = ++feedRequest,
          owner = session,
          revisions = { ...collectionRevisions };
        set({ feed: { ...feed, loadingMore: true, moreError: null } });
        try {
          const result = await api.list(feed.page + 1);
          if (owner !== session || request !== feedRequest) return;
          set((s) => ({
            entities: merge(result.items, revisions),
            feed: {
              ...s.feed,
              ids: [...new Set([...s.feed.ids, ...result.items.map((p) => p.id)])],
              page: result.page,
              hasMore: result.page < result.totalPages,
              loadingMore: false,
            },
          }));
        } catch (error) {
          if (owner !== session || request !== feedRequest) return;
          set((s) => ({
            feed: { ...s.feed, loadingMore: false, moreError: postErrorMessage(error) },
          }));
        }
      },
      async loadDetail(id) {
        if (get().details[id]?.refreshing) return;
        const request = (detailRequests[id] = (detailRequests[id] ?? 0) + 1);
        const owner = session,
          revisions = { ...collectionRevisions };
        setDetail(id, {
          status: get().entities[id] ? 'ready' : 'loading',
          refreshing: true,
          error: null,
        });
        try {
          const post = await api.detail(id);
          if (owner !== session || detailRequests[id] !== request) return;
          set({ entities: merge([post], revisions) });
          setDetail(id, { status: 'ready', refreshing: false, error: null });
        } catch (error) {
          if (owner !== session || detailRequests[id] !== request) return;
          if (statusOf(error) === 404) {
            removePost(id);
            return;
          }
          setDetail(id, {
            status: get().entities[id] ? 'ready' : 'error',
            refreshing: false,
            error: postErrorMessage(error),
          });
        }
      },
      cancelDetail(id) {
        detailRequests[id] = (detailRequests[id] ?? 0) + 1;
        setDetail(id, { ...idleDetail, status: get().entities[id] ? 'ready' : 'idle' });
      },
      async toggleCollection(id) {
        const post = get().entities[id],
          current = get().collections[id];
        if (!post || current?.pending) return;
        const target = current?.retryTarget ?? !post.collected;
        const owner = session;
        collectionRevisions[id] = (collectionRevisions[id] ?? 0) + 1;
        setCollection(id, { pending: true, error: null });
        try {
          const result = await api.collect(id, target);
          if (owner !== session) return;
          set((s) => ({
            entities: s.entities[id]
              ? {
                  ...s.entities,
                  [id]: {
                    ...s.entities[id],
                    collected: result.collected,
                    collectionCount: result.collectionCount,
                  },
                }
              : s.entities,
          }));
          setCollection(id, { pending: false, error: null });
        } catch (error) {
          if (owner !== session) return;
          const status = statusOf(error);
          if (status === 401) {
            setCollection(id, { pending: false, error: postErrorMessage(error) });
            return 'login';
          }
          if (status === 404) {
            removePost(id);
            setCollection(id, { pending: false, error: postErrorMessage(error) });
            return;
          }
          if (status === undefined || status >= 500) {
            // A timeout may mean the write committed. Read before offering another toggle.
            try {
              const actual = await api.detail(id);
              if (owner !== session) return;
              set((s) => ({ entities: { ...s.entities, [id]: actual } }));
              setCollection(id, {
                pending: false,
                error: actual.collected === target ? null : '收藏未完成，请重试',
              });
            } catch (readError) {
              if (owner !== session) return;
              if (statusOf(readError) === 404) removePost(id);
              setCollection(id, {
                pending: false,
                error: '收藏状态暂无法确认，请重试',
                retryTarget: target,
              });
            }
          } else setCollection(id, { pending: false, error: '收藏操作失败，请重试' });
        } finally {
          if (owner === session) collectionRevisions[id] = (collectionRevisions[id] ?? 0) + 1;
        }
      },
    };
  });
}
