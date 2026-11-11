import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { PlantHomeScreen } from '@/components/plants/plant-home-screen';
import { PlantCategoryScreen } from '@/components/plants/plant-category-screen';
import { PlantDetailScreen } from '@/components/plants/plant-detail-screen';
import { plantApi } from '@/services/plant-api';
import { Alert, Linking } from 'react-native';

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const View = require('react-native').View;
    return <View {...props} />;
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => false) },
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/plant-api', () => ({
  plantApi: { categories: jest.fn(), list: jest.fn(), detail: jest.fn(), addMine: jest.fn() },
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
  coverImage: null,
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

test('home shows category covers with accessible credits and falls back on image errors', async () => {
  (plantApi.categories as jest.Mock).mockResolvedValueOnce(categories.map((category, index) => ({
    ...category,
    coverPlantId: `cover-${index}`,
    coverImage: { url: `https://example.com/category-${index}.webp`, altText: `${category.nameZh}展示图`, attribution: '测试作者；已转换 WebP', license: 'CC BY-SA 4.0' },
  })));
  render(<PlantHomeScreen />);
  expect(await screen.findByLabelText('蕨类展示图')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '显示全部分类' }));
  expect(screen.getByLabelText('分类6展示图')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '图片署名与许可' }));
  expect(screen.getAllByText('测试作者；已转换 WebP')).toHaveLength(8);
  expect(screen.getAllByText('CC BY-SA 4.0')).toHaveLength(8);
  fireEvent.press(screen.getByRole('link', { name: '查看蕨类图片来源与许可' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/plants/[id]', params: { id: 'cover-0' } });
  fireEvent(screen.getByLabelText('蕨类展示图'), 'onError');
  expect(screen.queryByLabelText('蕨类展示图')).toBeNull();
  expect(screen.getByText('暂无图片')).toBeTruthy();
});

test('loads a category list, marks unverified identities, and opens a plant', async () => {
  render(<PlantCategoryScreen slug="ferns" />);
  expect(await screen.findByText('铁线蕨')).toBeTruthy();
  expect(screen.getByText('身份待核对')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '查看植物：铁线蕨' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/plants/[id]', params: { id: 'fern-1' } });
});

test('shows a cover image in the list and falls back to the placeholder when it fails', async () => {
  (plantApi.list as jest.Mock).mockResolvedValueOnce([{ ...fern, coverImage: { url: 'https://example.com/fern.webp', altText: '铁线蕨展示图' } }]);
  render(<PlantCategoryScreen slug="ferns" />);
  const image = await screen.findByLabelText('铁线蕨展示图');
  expect(image).toBeTruthy();
  fireEvent(image, 'onError');
  expect(await screen.findByText('暂无图片')).toBeTruthy();
});

test('shows plant identity and clear empty care data without implying verification or photos', async () => {
  render(<PlantDetailScreen id="fern-1" />);
  expect(await screen.findByText('铁线蕨')).toBeTruthy();
  expect(screen.getByText('身份待核对')).toBeTruthy();
  expect(screen.getByText('养护资料待补充')).toBeTruthy();
  expect(screen.getByText('图片资料暂未添加')).toBeTruthy();
  expect(screen.getByText('Adiantum capillus-veneris')).toBeTruthy();
  expect(screen.getByRole('button', { name: '添加到我的植物' })).toBeTruthy();
});

test('shows the cover image and attribution on plant details', async () => {
  const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(true);
  (plantApi.detail as jest.Mock).mockResolvedValueOnce({
    ...detail,
    coverImage: {
      url: 'https://example.com/fern.webp', altText: '铁线蕨展示图', sourceName: 'Wikimedia Commons',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fern.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', attribution: '作者，Wikimedia Commons',
    },
  });
  render(<PlantDetailScreen id="fern-1" />);
  expect(await screen.findByLabelText('铁线蕨展示图')).toBeTruthy();
  expect(screen.getByText('Wikimedia Commons')).toBeTruthy();
  expect(screen.getByText('许可证：CC BY-SA 4.0')).toBeTruthy();
  expect(screen.getByText('署名：作者，Wikimedia Commons')).toBeTruthy();
  fireEvent.press(screen.getByRole('link', { name: '查看图片来源' }));
  expect(openUrl).toHaveBeenCalledWith('https://commons.wikimedia.org/wiki/File:Fern.jpg');
  openUrl.mockRestore();
});

test('detail image failure falls back and the next plant image still loads', async () => {
  (plantApi.detail as jest.Mock).mockResolvedValueOnce({ ...detail, coverImage: { url: 'https://example.com/old.webp', altText: '旧图' } });
  const view = render(<PlantDetailScreen id="fern-1" />);
  fireEvent(await screen.findByLabelText('旧图'), 'onError');
  expect(screen.getByText('图片资料暂未添加')).toBeTruthy();
  (plantApi.detail as jest.Mock).mockResolvedValueOnce({ ...detail, id: 'next', nameZh: '新植物', coverImage: { url: 'https://example.com/new.webp', altText: '新图' } });
  view.rerender(<PlantDetailScreen id="next" />);
  expect(await screen.findByLabelText('新图')).toBeTruthy();
  expect(screen.queryByText('图片资料暂未添加')).toBeNull();
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
  fireEvent.press(screen.getByRole('button', { name: '返回上一页' }));
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
  expect(screen.getByRole('button', { name: '添加到我的植物' }).props.accessibilityState.disabled).not.toBe(true);
});

test('adds a plant instance, reports success, and allows repeated additions', async () => {
  (plantApi.addMine as jest.Mock).mockResolvedValue({ instanceId: 'instance-1' });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  render(<PlantDetailScreen id="fern-1" />);
  const button = await screen.findByRole('button', { name: '添加到我的植物' });
  fireEvent.press(button);
  await waitFor(() => expect(plantApi.addMine).toHaveBeenCalledWith('fern-1'));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('添加成功', '已添加到我的植物'));
  fireEvent.press(screen.getByRole('button', { name: '添加到我的植物' }));
  await waitFor(() => expect(plantApi.addMine).toHaveBeenCalledTimes(2));
  alert.mockRestore();
});

test('shows a retry message when adding a plant fails', async () => {
  (plantApi.addMine as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  render(<PlantDetailScreen id="fern-1" />);
  fireEvent.press(await screen.findByRole('button', { name: '添加到我的植物' }));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('添加失败', '请检查网络后重试。'));
  alert.mockRestore();
});

test('returns to the plant detail after signing in when adding requires authentication', async () => {
  (plantApi.addMine as jest.Mock).mockRejectedValueOnce({ response: { status: 401 } });
  render(<PlantDetailScreen id="fern-1" />);
  fireEvent.press(await screen.findByRole('button', { name: '添加到我的植物' }));
  await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/auth', params: { returnTo: '/plants/fern-1' } }));
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
