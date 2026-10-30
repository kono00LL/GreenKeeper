import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CommunityScreen } from '@/components/community/community-screen';
import { PostDetailScreen } from '@/components/community/post-detail-screen';
import { PostGallery } from '@/components/community/post-gallery';
import { PostImageView } from '@/components/community/post-image';
import { CommunityHeader } from '@/components/community/community-header';
import { postStore } from '@/store/post-store';
import { postApi } from '@/services/post-api';
import { useAuthStore } from '@/store/auth-store';
import { router } from 'expo-router';
import type { Post } from '@/types/post';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => false) },
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/post-api', () => ({
  postApi: { list: jest.fn(), detail: jest.fn(), collect: jest.fn() },
}));
const post: Post = {
  id: 'a',
  title: '窗边的绿植',
  excerpt: '光照与浇水',
  content: '第一段\n第二段',
  images: [],
  coverImage: null,
  category: 'article',
  createdAt: '2026-01-01',
  collected: false,
  collectionCount: 2,
};
const result = (items: Post[]) => ({
  items,
  page: 1,
  pageSize: 10,
  total: items.length,
  totalPages: items.length ? 1 : 0,
});
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().clearSession();
  postStore.setState({ entities: {}, feed: { ...postStore.getState().feed, ids: [] } });
  (postApi.list as jest.Mock).mockResolvedValue(result([post]));
  (postApi.detail as jest.Mock).mockResolvedValue(post);
});
test('renders feed and navigates from title; guest collection opens login with return target', async () => {
  render(<CommunityScreen />);
  expect(screen.getByText('正在加载帖子…')).toBeTruthy();
  fireEvent.press(await screen.findByText(post.title));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/posts/[post-id]',
    params: { 'post-id': 'a' },
  });
  fireEvent.press(screen.getByRole('button', { name: '收藏，2 人收藏' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/auth', params: { returnTo: '/post' } });
  expect(postApi.collect).not.toHaveBeenCalled();
});
test('offers initial retry and an empty state', async () => {
  (postApi.list as jest.Mock)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(result([]));
  render(<CommunityScreen />);
  fireEvent.press(await screen.findByRole('button', { name: '重试' }));
  expect(await screen.findByText('还没有帖子')).toBeTruthy();
});
test('loads direct detail, preserves paragraphs, and provides a community fallback', async () => {
  render(<PostDetailScreen id="a" />);
  expect(await screen.findByText('第一段\n第二段')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '返回社区' }));
  expect(router.replace).toHaveBeenCalledWith('/(tabs)/post');
});
test('renders missing detail without stale body', async () => {
  (postApi.detail as jest.Mock).mockRejectedValueOnce({ response: { status: 404 } });
  render(<PostDetailScreen id="missing" />);
  expect(await screen.findByText('帖子不存在或已删除')).toBeTruthy();
  expect(screen.queryByText('第一段\n第二段')).toBeNull();
});
test('confirmed collection updates the same data used by cards and detail', async () => {
  useAuthStore.getState().setSession({ user_id: 'u' } as never, 'a', 'r');
  (postApi.collect as jest.Mock).mockResolvedValue({
    post_id: 'a',
    collected: true,
    collectionCount: 3,
  });
  render(<PostDetailScreen id="a" />);
  fireEvent.press(await screen.findByRole('button', { name: '收藏，2 人收藏' }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '取消收藏，3 人收藏' })).toBeTruthy(),
  );
  expect(postStore.getState().entities.a.collected).toBe(true);
});
test('image failure has a retry and absent images have a placeholder', async () => {
  const view = render(
    <PostImageView
      image={{ id: '1', url: 'https://example.com/1.jpg', width: null, height: null }}
      height={180}
      label="帖子图片"
    />,
  );
  fireEvent(screen.getByLabelText('帖子图片'), 'error', { nativeEvent: { error: 'offline' } });
  fireEvent.press(screen.getByRole('button', { name: '重试图片' }), { stopPropagation: jest.fn() });
  expect(screen.getByLabelText('帖子图片')).toBeTruthy();
  view.rerender(<PostImageView height={180} label="帖子图片" />);
  expect(screen.getByText('暂无图片')).toBeTruthy();
});
test('gallery opens selected image, changes index and keeps it after closing', async () => {
  render(
    <PostGallery
      images={[1, 2].map((n) => ({
        id: `${n}`,
        url: `https://example.com/${n}.jpg`,
        width: 800,
        height: 600,
      }))}
    />,
  );
  fireEvent.press(screen.getByRole('button', { name: '查看第 2 张大图' }));
  expect(screen.getByRole('button', { name: '关闭大图' })).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '上一张' }));
  fireEvent.press(screen.getByRole('button', { name: '关闭大图' }));
  expect(screen.getByText('1 / 2')).toBeTruthy();
});

test('top feature actions open separate full-screen routes', () => {
  render(<CommunityHeader height={120} />);
  fireEvent.press(screen.getByRole('button', { name: '每日问答' }));
  fireEvent.press(screen.getByRole('button', { name: '绿植托管' }));
  fireEvent.press(screen.getByRole('button', { name: '上门服务' }));
  expect(router.push).toHaveBeenNthCalledWith(1, {
    pathname: '/community/[feature]',
    params: { feature: 'daily' },
  });
  expect(router.push).toHaveBeenNthCalledWith(2, {
    pathname: '/community/[feature]',
    params: { feature: 'plants' },
  });
  expect(router.push).toHaveBeenNthCalledWith(3, {
    pathname: '/community/[feature]',
    params: { feature: 'ranking' },
  });
});
