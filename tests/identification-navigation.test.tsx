import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { CameraPreviewScreen } from '@/components/camera/camera-preview-screen';
import { PlantDetailScreen } from '@/components/plants/plant-detail-screen';
import { identifyPlant } from '@/services/plant-identification-api';
import { plantApi } from '@/services/plant-api';

jest.mock('@/services/plant-identification-api', () => ({ identifyPlant: jest.fn(), identificationErrorMessage: () => '识别失败' }));
jest.mock('@/services/plant-api', () => ({ plantApi: { detail: jest.fn() } }));

function DetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlantDetailScreen id={id} />;
}

test.each([false, true])('real stack returns to the same preview without another identification (deleted=%s)', async (deleted) => {
  jest.clearAllMocks();
  (identifyPlant as jest.Mock).mockResolvedValue({ bestMatch: 'Adiantum capillus-veneris L.', candidates: [{
    scientificName: 'Adiantum capillus-veneris L.', commonNames: [], score: 0.9,
    localMatch: { status: 'matched', plant: { id: 'fern-uuid', nameZh: '铁线蕨' } },
  }] });
  if (deleted) (plantApi.detail as jest.Mock).mockRejectedValue({ response: { status: 404 } });
  else (plantApi.detail as jest.Mock).mockResolvedValue({
    id: 'fern-uuid', nameZh: '铁线蕨', nameEn: null, scientificName: 'Adiantum capillus-veneris', identityStatus: 'verified',
    categories: [], aliases: [], summary: '蕨类植物。', appearanceFeatures: null,
    temperatureMinC: null, temperatureMaxC: null, temperatureNotes: null,
    sunlightRequirement: null, wateringRequirement: null, repottingRequirement: null, pests: null,
  });
  const view = renderRouter({
    _layout: () => <Stack screenOptions={{ headerShown: false }} />,
    'camera-preview': CameraPreviewScreen,
    'plants/[id]': DetailRoute,
  }, { initialUrl: '/camera-preview?uri=file%3A%2F%2F%2Fplant.jpg' });
  fireEvent.press(screen.getByRole('button', { name: '识别植物' }));
  fireEvent.press(await screen.findByRole('button', { name: '查看植物资料：铁线蕨' }));
  await waitFor(() => expect(view.getPathname()).toBe('/plants/fern-uuid'));
  expect(plantApi.detail).toHaveBeenCalledWith('fern-uuid');
  if (deleted) expect(await screen.findByText('没有找到这项植物资料')).toBeTruthy();
  else expect(await screen.findByText('蕨类植物。')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '返回上一页' }));
  await waitFor(() => expect(view.getPathname()).toBe('/camera-preview'));
  expect(await screen.findByText('Adiantum capillus-veneris L.')).toBeTruthy();
  expect(screen.getByLabelText('已选择的图片')).toBeTruthy();
  expect(identifyPlant).toHaveBeenCalledTimes(1);
});
