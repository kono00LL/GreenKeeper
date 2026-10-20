import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { CollectionsScreen } from '@/components/collections/collections-screen';
import { getCollections } from '@/services/post-api';
import { useAuthStore } from '@/store/auth-store';
import type { Post } from '@/types/post';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/post-api', () => ({ getCollections: jest.fn() }));

const article: Post = {
  id: 'article-1',
  title: '窗边的绿植',
  excerpt: '观察光照和土壤',
  content: '文章内容',
  coverImage: null,
  createdAt: '2026-10-20',
  category: 'article',
  images: [],
  collectionCount: 4,
  collected: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().setSession({ user_id: 'user-1' } as never, 'access', 'refresh');
  (getCollections as jest.Mock).mockResolvedValue([article]);
});

test('shows article collections without community collection controls and opens detail', async () => {
  render(<CollectionsScreen />);
  expect(await screen.findByText(article.title)).toBeTruthy();
  expect(getCollections).toHaveBeenCalledWith('article');
  expect(screen.queryByText('4')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: `查看收藏文章：${article.title}` }));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/posts/[post-id]',
    params: { 'post-id': article.id },
  });
});

test('keeps encyclopedia visible as an unopened category', async () => {
  render(<CollectionsScreen />);
  await screen.findByText(article.title);
  fireEvent.press(screen.getByRole('tab', { name: '百科' }));
  expect(screen.getByText('百科收藏暂未开放')).toBeTruthy();
  expect(getCollections).toHaveBeenCalledTimes(1);
});

test('redirects unauthenticated visitors to registration', () => {
  useAuthStore.getState().clearSession();
  render(<CollectionsScreen />);
  expect(router.replace).toHaveBeenCalledWith('/auth');
  expect(getCollections).not.toHaveBeenCalled();
});
