import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { PlantSearchScreen } from '@/components/plants/plant-search-screen';
import { plantApi } from '@/services/plant-api';
import type { PlantSummary } from '@/types/plant';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => require('react').createElement(require('react-native').View, props),
}));
jest.mock('@/services/plant-api', () => ({ plantApi: { list: jest.fn() } }));

const names = [
  ['绿萝', 'Golden pothos', 'Epipremnum aureum'],
  ['龟背竹', 'Swiss cheese plant', 'Monstera deliciosa'],
  ['虎尾兰', null, 'Dracaena trifasciata'],
  ['吊兰', null, 'Chlorophytum comosum'],
  ['琴叶榕', null, 'Ficus lyrata'],
  ['芦荟', null, 'Aloe vera'],
  ['铁线蕨', 'Maidenhair fern', 'Adiantum capillus-veneris'],
] as const;
const plants: PlantSummary[] = names.map(([nameZh, nameEn, scientificName], index) => ({
  id: `plant-${index}`, nameZh, nameEn, scientificName, identityStatus: 'pending', categories: [],
  coverImage: index === 0 ? { url: 'https://example.test/pothos.webp', altText: '绿萝展示图' } : null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  (plantApi.list as jest.Mock).mockResolvedValue([...plants].reverse());
  (router.canGoBack as jest.Mock).mockReturnValue(true);
});

test('shows fixed recommendations in order using actual catalogue IDs', async () => {
  render(<PlantSearchScreen />);
  expect(screen.getByPlaceholderText('搜索植物').props.autoFocus).toBe(true);
  expect(await screen.findByRole('button', { name: '查看植物：绿萝' })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^查看植物：/ }).map((node) => node.props.accessibilityLabel))
    .toEqual(names.slice(0, 6).map(([name]) => `查看植物：${name}`));
  expect(screen.queryByText('铁线蕨')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '查看植物：龟背竹' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/plants/[id]', params: { id: 'plant-1' } });
});

test('searches Chinese, English and scientific names locally and restores recommendations on clear', async () => {
  render(<PlantSearchScreen />);
  await screen.findByText('绿萝');
  const input = screen.getByPlaceholderText('搜索植物');
  for (const query of ['线蕨', '  MAIDENHAIR  ', ' CAPILLUS-VENERIS ']) {
    fireEvent.changeText(input, query);
    expect(screen.getByText('搜索结果')).toBeTruthy();
    expect(screen.getByText('铁线蕨')).toBeTruthy();
    expect(screen.queryByText('绿萝')).toBeNull();
  }
  fireEvent.changeText(input, '找不到的植物');
  expect(screen.getByText('没有找到匹配的植物')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '清空搜索' }));
  expect(input.props.value).toBe('');
  expect(screen.getByText('推荐植物')).toBeTruthy();
  expect(screen.getByText('绿萝')).toBeTruthy();
  expect(plantApi.list).toHaveBeenCalledTimes(1);
});

test('offers a blue cancel action without a back arrow and dismisses the keyboard', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
  render(<PlantSearchScreen />);
  await screen.findByText('绿萝');
  expect(screen.queryByText('‹')).toBeNull();
  expect(StyleSheet.flatten(screen.getByText('取消').props.style).color).toBe('#007aff');
  fireEvent(screen.getByPlaceholderText('搜索植物'), 'submitEditing');
  expect(dismiss).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: '取消' }));
  expect(dismiss).toHaveBeenCalledTimes(2);
  expect(router.back).toHaveBeenCalledTimes(1);
  (router.canGoBack as jest.Mock).mockReturnValue(false);
  fireEvent.press(screen.getByRole('button', { name: '取消' }));
  expect(router.replace).toHaveBeenCalledWith('/');
  dismiss.mockRestore();
});

test('retries a failed catalogue load and skips missing recommendations', async () => {
  (plantApi.list as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([plants[1]]);
  render(<PlantSearchScreen />);
  expect(screen.getByText('正在加载植物…')).toBeTruthy();
  fireEvent.press(await screen.findByRole('button', { name: '重试' }));
  expect(await screen.findByText('龟背竹')).toBeTruthy();
  expect(screen.queryByText('绿萝')).toBeNull();
});

test('keeps recommendations readable when their images fail', async () => {
  render(<PlantSearchScreen />);
  const image = await screen.findByLabelText('绿萝展示图');
  fireEvent(image, 'onError');
  expect(screen.queryByLabelText('绿萝展示图')).toBeNull();
  expect(screen.getByText('绿萝')).toBeTruthy();
  expect(screen.getAllByLabelText('暂无图片')).toHaveLength(6);
  expect(screen.getAllByText('身份待核对')).toHaveLength(6);
});

test('handles a catalogue without recommended plants while still allowing search', async () => {
  (plantApi.list as jest.Mock).mockResolvedValueOnce([plants[6]]);
  render(<PlantSearchScreen />);
  expect(await screen.findByText('暂无推荐植物')).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText('搜索植物'), '蕨');
  expect(screen.getByText('铁线蕨')).toBeTruthy();
});
