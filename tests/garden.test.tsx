import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { GardenScreen } from '@/components/garden/garden-screen';
import { plantApi } from '@/services/plant-api';

jest.mock('expo-image', () => ({
  Image: (props: Record<string, unknown>) => {
    const View = require('react-native').View;
    return <View {...props} />;
  },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/plant-api', () => ({
  plantApi: { mine: jest.fn(), removeMine: jest.fn(), renameMine: jest.fn() },
}));
jest.mock('@/components/garden/reminders-list', () => ({ RemindersList: () => <>{require('react').createElement(require('react-native').Text, null, '应用内提醒列表')}</> }));

const fern = {
  id: 'fern-1', nameZh: '铁线蕨', nameEn: null,
  scientificName: 'Adiantum capillus-veneris', identityStatus: 'pending' as const,
  categories: [{ slug: 'ferns', nameZh: '蕨类', nameEn: 'Ferns' }], coverImage: null,
  createdAt: '2026-11-10T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  (plantApi.mine as jest.Mock).mockReset();
  (plantApi.removeMine as jest.Mock).mockReset();
  (plantApi.renameMine as jest.Mock).mockReset();
  (plantApi.mine as jest.Mock).mockResolvedValue([]);
  (plantApi.removeMine as jest.Mock).mockResolvedValue({ removed: true });
  (plantApi.renameMine as jest.Mock).mockResolvedValue({});
});

test('shows the garden empty state and switches to reminder placeholder', async () => {
  render(<GardenScreen />);

  expect(await screen.findByText('您的花园中没有植物 😔')).toBeTruthy();
  expect(screen.getByRole('button', { name: '添加植物' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '✦  最佳适合植物' })).toBeTruthy();
  fireEvent.press(screen.getByRole('tab', { name: '提醒事项' }));
  expect(screen.getByText('应用内提醒列表')).toBeTruthy();
  expect(screen.queryByText('您的花园中没有植物 😔')).toBeNull();
});

test('renders a personal plant, opens its detail, and immediately removes its instance from the options menu', async () => {
  (plantApi.mine as jest.Mock).mockResolvedValueOnce([{ ...fern, instanceId: 'instance-1' }]).mockResolvedValueOnce([]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    const remove = buttons?.find((button) => button.text === '删除实例');
    remove?.onPress?.();
  });
  render(<GardenScreen />);

  expect(await screen.findByText('铁线蕨')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '查看植物：铁线蕨' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/plants/[id]', params: { id: 'fern-1' } });
  fireEvent.press(screen.getByRole('button', { name: '植物选项：铁线蕨' }));
  await waitFor(() => expect(plantApi.removeMine).toHaveBeenCalledWith('instance-1'));
  expect(alert).toHaveBeenCalledWith('植物选项', '选择要对「铁线蕨」进行的操作', expect.any(Array));
  alert.mockRestore();
});

test('renders duplicate species as separate cards and removes only the selected instance', async () => {
  (plantApi.mine as jest.Mock).mockResolvedValueOnce([
    { ...fern, instanceId: 'instance-1' },
    { ...fern, instanceId: 'instance-2' },
  ]).mockResolvedValueOnce([{ ...fern, instanceId: 'instance-2' }]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.text === '删除实例')?.onPress?.();
  });
  render(<GardenScreen />);
  expect(await screen.findAllByRole('button', { name: '查看植物：铁线蕨' })).toHaveLength(2);
  fireEvent.press(screen.getAllByRole('button', { name: '植物选项：铁线蕨' })[0]);
  await waitFor(() => expect(plantApi.removeMine).toHaveBeenCalledWith('instance-1'));
  await waitFor(() => expect(screen.getAllByRole('button', { name: '查看植物：铁线蕨' })).toHaveLength(1));
  expect(plantApi.removeMine).not.toHaveBeenCalledWith('fern-1');
  alert.mockRestore();
});

test('renders the same plant cover URL in the garden preview', async () => {
  (plantApi.mine as jest.Mock).mockResolvedValueOnce([{
    ...fern,
    instanceId: 'instance-with-cover',
    coverImage: { url: 'https://example.com/fern.webp', altText: '铁线蕨展示图' },
  }]);
  render(<GardenScreen />);
  expect(await screen.findByLabelText('铁线蕨展示图')).toBeTruthy();
});

test('renames only the selected instance using a prefilled cross-platform dialog', async () => {
  (plantApi.mine as jest.Mock).mockResolvedValueOnce([
    { ...fern, instanceId: 'instance-1', customName: null },
    { ...fern, instanceId: 'instance-2', customName: '窗边那盆' },
  ]).mockResolvedValueOnce([
    { ...fern, instanceId: 'instance-1', customName: null },
    { ...fern, instanceId: 'instance-2', customName: '书房铁线蕨' },
  ]);
  (plantApi.renameMine as jest.Mock).mockResolvedValue({ ...fern, instanceId: 'instance-2', customName: '书房铁线蕨' });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.text === '重命名')?.onPress?.();
  });
  render(<GardenScreen />);
  expect(await screen.findAllByRole('button', { name: /查看植物：/ })).toHaveLength(2);
  fireEvent.press(screen.getAllByRole('button', { name: /植物选项：/ })[1]);
  expect(alert).toHaveBeenCalledWith('植物选项', '选择要对「窗边那盆」进行的操作', expect.any(Array));
  const input = await screen.findByDisplayValue('窗边那盆');
  fireEvent.changeText(input, '  书房铁线蕨  ');
  fireEvent.press(screen.getByRole('button', { name: '保存名称' }));
  await waitFor(() => expect(plantApi.renameMine).toHaveBeenCalledWith('instance-2', '书房铁线蕨'));
  expect(plantApi.renameMine).not.toHaveBeenCalledWith('instance-1', '书房铁线蕨');
  expect(await screen.findByRole('button', { name: '查看植物：书房铁线蕨' })).toBeTruthy();
  alert.mockRestore();
});

test('deletes a selected instance immediately without confirmation', async () => {
  (plantApi.mine as jest.Mock).mockResolvedValueOnce([{ ...fern, instanceId: 'instance-1' }]).mockResolvedValueOnce([]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.text === '删除实例')?.onPress?.();
  });
  render(<GardenScreen />);
  fireEvent.press(await screen.findByRole('button', { name: /植物选项：/ }));
  await waitFor(() => expect(plantApi.removeMine).toHaveBeenCalledWith('instance-1'));
  expect(alert).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: '查看植物：铁线蕨' })).toBeNull();
  alert.mockRestore();
});
