import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { PlantHomeScreen } from '@/components/plants/plant-home-screen';
import { PlantCategoryScreen } from '@/components/plants/plant-category-screen';
import { PlantDetailScreen } from '@/components/plants/plant-detail-screen';
import { plantApi } from '@/services/plant-api';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => false) },
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/plant-api', () => ({
  plantApi: { categories: jest.fn(), list: jest.fn(), detail: jest.fn() },
}));

const categories = [
  { id: 'ferns', slug: 'ferns', nameZh: '蕨类', nameEn: 'Ferns', plantCount: 2 },
  ...Array.from({ length: 7 }, (_, index) => ({
    id: `category-${index}`,
    slug: `category-${index}`,
    nameZh: `分类${index}`,
    nameEn: `Category ${index}`,
    plantCount: 0,
  })),
];
const fern = {
  id: 'fern-1', nameZh: '铁线蕨', nameEn: null,
  scientificName: 'Adiantum capillus-veneris', identityStatus: 'pending' as const,
  categories: [{ slug: 'ferns', nameZh: '蕨类', nameEn: 'Ferns' }],
};
const detail = {
  ...fern,
  aliases: [],
  summary: null, appearanceFeatures: null,
  temperatureMinC: null, temperatureMaxC: null, temperatureNotes: null,
  sunlightRequirement: null, wateringRequirement: null,
  repottingRequirement: null, pests: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (plantApi.categories as jest.Mock).mockResolvedValue(categories);
  (plantApi.list as jest.Mock).mockResolvedValue([fern]);
  (plantApi.detail as jest.Mock).mockResolvedValue(detail);
});

test('shows the first four categories, can expand, and opens a category list', async () => {
  render(<PlantHomeScreen />);
  expect(await screen.findByText('蕨类')).toBeTruthy();
  expect(screen.queryByText('分类6')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '显示全部分类' }));
  expect(screen.getByText('分类6')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '收起分类' }));
  expect(screen.queryByText('分类6')).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '显示全部分类' }));
  fireEvent.press(screen.getByRole('button', { name: '查看分类：蕨类' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/plants/category/[slug]', params: { slug: 'ferns' } });
});

test('loads a category list, marks unverified identities, and opens a plant', async () => {
  render(<PlantCategoryScreen slug="ferns" />);
  expect(await screen.findByText('铁线蕨')).toBeTruthy();
  expect(screen.getByText('身份待核对')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '查看植物：铁线蕨' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/plants/[id]', params: { id: 'fern-1' } });
});

test('shows plant identity and clear empty care data without implying verification or photos', async () => {
  render(<PlantDetailScreen id="fern-1" />);
  expect(await screen.findByText('铁线蕨')).toBeTruthy();
  expect(screen.getByText('身份待核对')).toBeTruthy();
  expect(screen.getByText('养护资料待补充')).toBeTruthy();
  expect(screen.getByText('图片资料暂未添加')).toBeTruthy();
  expect(screen.getByText('Adiantum capillus-veneris')).toBeTruthy();
});

test('retries failed category loading and handles an empty catalogue', async () => {
  (plantApi.categories as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  render(<PlantHomeScreen />);
  fireEvent.press(await screen.findByRole('button', { name: '重试' }));
  expect(await screen.findByText('暂无植物分类')).toBeTruthy();
});

test('keeps an empty category navigable when opened directly', async () => {
  (plantApi.list as jest.Mock).mockResolvedValueOnce([]);
  render(<PlantCategoryScreen slug="ferns" />);
  expect(await screen.findByText('这个分类暂时没有植物资料')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '返回分类总览' }));
  expect(router.replace).toHaveBeenCalledWith('/');
});

test('distinguishes a missing plant from a network error and keeps a back button', async () => {
  (plantApi.detail as jest.Mock).mockRejectedValueOnce({ response: { status: 404 } });
  render(<PlantDetailScreen id="missing" />);
  expect(await screen.findByText('没有找到这项植物资料')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '重试' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: '返回植物列表' }));
  expect(router.replace).toHaveBeenCalledWith('/');
});

test('retries a plant detail network error', async () => {
  (plantApi.detail as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  render(<PlantDetailScreen id="fern-1" />);
  fireEvent.press(await screen.findByRole('button', { name: '重试' }));
  expect(await screen.findByText('铁线蕨')).toBeTruthy();
});

test('shows partial care fields, zero temperature, and expands a multiline summary', async () => {
  const summary = Array.from({ length: 6 }, (_, i) => `第${i + 1}行`).join('\n');
  (plantApi.detail as jest.Mock).mockResolvedValueOnce({ ...detail, identityStatus: 'verified', summary, temperatureMinC: 0, temperatureNotes: '测试温度说明' });
  render(<PlantDetailScreen id="fern-1" />);
  expect(await screen.findByText('铁线蕨')).toBeTruthy();
  expect(screen.queryByText('身份待核对')).toBeNull();
  expect(screen.getByText('阳光')).toBeTruthy();
  expect(screen.getByText('换盆')).toBeTruthy();
  expect(screen.getByText(/0 °C/)).toBeTruthy();
  expect(screen.getByText(/测试温度说明/)).toBeTruthy();
  expect(screen.getByText(summary).props.numberOfLines).toBe(5);
  fireEvent.press(screen.getByRole('button', { name: '阅读更多' }));
  expect(screen.getByText(summary).props.numberOfLines).toBeUndefined();
  expect(screen.getByRole('button', { name: '添加到我的植物（暂未开放）' }).props.accessibilityState.disabled).toBe(true);
});

test('ignores an old plant response after the route changes', async () => {
  let resolveOld!: (value: typeof detail) => void;
  (plantApi.detail as jest.Mock)
    .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ ...detail, id: 'new', nameZh: '新植物' });
  const view = render(<PlantDetailScreen id="old" />);
  view.rerender(<PlantDetailScreen id="new" />);
  expect(await screen.findByText('新植物')).toBeTruthy();
  await act(async () => resolveOld(detail));
  expect(screen.queryByText('铁线蕨')).toBeNull();
  expect(screen.getByText('新植物')).toBeTruthy();
});
