import React from 'react';
import { Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import TabsLayout from '@/app/(tabs)/_layout';
import HomeLayout, { unstable_settings } from '@/app/(tabs)/(home)/_layout';
import HomePage from '@/app/(tabs)/(home)/index';
import PlantSearchPage from '@/app/(tabs)/(home)/plants/search';
import { plantApi } from '@/services/plant-api';

jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/services/plant-api', () => ({ plantApi: { categories: jest.fn(), list: jest.fn() } }));

function Root() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
function OtherTab() {
  return <Text>其他页面</Text>;
}
const routes = {
  _layout: Root,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/(home)/_layout': { default: HomeLayout, unstable_settings },
  '(tabs)/(home)/index': HomePage,
  '(tabs)/(home)/plants/search': PlantSearchPage,
  '(tabs)/garden': OtherTab,
  '(tabs)/camera': OtherTab,
  '(tabs)/post': OtherTab,
  '(tabs)/profile': OtherTab,
  'plants/[id]': OtherTab,
};

beforeEach(() => {
  jest.clearAllMocks();
  (plantApi.categories as jest.Mock).mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({
    id: `${index}`, slug: `${index}`, nameZh: `分类${index}`, nameEn: '', plantCount: 1, coverImage: null,
  })));
  (plantApi.list as jest.Mock).mockResolvedValue([]);
});

test('opens search inside the selected home tab and cancellation preserves the mounted home', async () => {
  const app = renderRouter(routes, { initialUrl: '/' });
  await screen.findByText('分类0');
  fireEvent.press(screen.getByRole('button', { name: '显示全部分类' }));
  expect(screen.getByText('分类4')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '搜索植物' }));
  await screen.findByRole('button', { name: '取消' });
  expect(app.getPathname()).toBe('/plants/search');
  const tabState = app.getRouterState()?.routes[0].state?.routes.find((route) => route.name === '(tabs)')?.state;
  expect(tabState?.routes).toHaveLength(5);
  expect(tabState?.routes[tabState.index ?? 0].name).toBe('(home)');
  expect(screen.getByText('主页')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '取消' }));
  await waitFor(() => expect(app.getPathname()).toBe('/'));
  expect(screen.getByText('分类4')).toBeTruthy();
});

test('a direct search link resolves to search instead of a plant detail with a search ID', async () => {
  const app = renderRouter(routes, { initialUrl: '/plants/search' });
  expect(await screen.findByRole('button', { name: '取消' })).toBeTruthy();
  expect(app.getSegments()).toEqual(['(tabs)', '(home)', 'plants', 'search']);
  fireEvent.press(screen.getByRole('button', { name: '取消' }));
  await waitFor(() => expect(app.getPathname()).toBe('/'));
});

test('switching tabs preserves the search text and plant details return to the search', async () => {
  (plantApi.list as jest.Mock).mockResolvedValue([{
    id: 'actual-pothos-id', nameZh: '绿萝', nameEn: 'Pothos', scientificName: 'Epipremnum aureum',
    identityStatus: 'verified', categories: [], coverImage: null,
  }]);
  const app = renderRouter(routes, { initialUrl: '/plants/search' });
  await screen.findByText('绿萝');
  fireEvent.changeText(screen.getByPlaceholderText('搜索植物'), 'pothos');
  act(() => router.navigate('/garden'));
  await waitFor(() => expect(app.getPathname()).toBe('/garden'));
  act(() => router.navigate('/plants/search'));
  await screen.findByText('绿萝');
  expect(screen.getByPlaceholderText('搜索植物').props.value).toBe('pothos');
  fireEvent.press(screen.getByRole('button', { name: '查看植物：绿萝' }));
  await waitFor(() => expect(app.getPathname()).toBe('/plants/actual-pothos-id'));
  act(() => router.back());
  await screen.findByRole('button', { name: '取消' });
  expect(app.getPathname()).toBe('/plants/search');
  expect(screen.getByPlaceholderText('搜索植物').props.value).toBe('pothos');
});
