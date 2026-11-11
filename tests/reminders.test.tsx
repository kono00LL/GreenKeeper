import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ReminderFormScreen } from '@/components/garden/reminder-form-screen';
import { RemindersList } from '@/components/garden/reminders-list';
import { reminderApi } from '@/services/reminder-api';
import { plantApi } from '@/services/plant-api';
import { addCalendarDays, dueStatus, previewSchedule } from '@/services/reminder-dates';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));
jest.mock('@/services/reminder-api', () => ({ reminderApi: { mine: jest.fn(), create: jest.fn(), update: jest.fn(), complete: jest.fn(), remove: jest.fn() } }));
jest.mock('@/services/plant-api', () => ({ plantApi: { mine: jest.fn() } }));
const plant = { id: 'fern-1', instanceId: 'instance-1', nameZh: '铁线蕨', customName: '窗边这盆' };
const reminder = { id: 'reminder-1', instanceId: 'instance-1', plantId: 'fern-1', displayName: '窗边这盆', careType: 'watering', interval: 2, unit: 'days', time: '09:00', timeZone: 'Asia/Taipei', lastCareChoice: 'yesterday', lastCareDate: '2026-11-10', anchorDate: '2026-11-10', nextDueDate: '2026-11-12', createdAt: '', updatedAt: '' };
beforeEach(() => {
  jest.clearAllMocks();
  (plantApi.mine as jest.Mock).mockReset().mockResolvedValue([plant]);
  (reminderApi.mine as jest.Mock).mockReset().mockResolvedValue([]);
  (reminderApi.create as jest.Mock).mockReset().mockResolvedValue(reminder);
  (reminderApi.update as jest.Mock).mockReset().mockResolvedValue(reminder);
  (reminderApi.complete as jest.Mock).mockReset().mockResolvedValue(reminder);
  (reminderApi.remove as jest.Mock).mockReset().mockResolvedValue({ removed: true });
});
test('previews calendar dates and preserves overdue days', () => {
  expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
  expect(addCalendarDays('2026-12-31', 7)).toBe('2027-01-07');
  expect(previewSchedule('2026-11-11', 'unknown', 2, 'weeks').nextDueDate).toBe('2026-11-25');
  expect(dueStatus('2026-11-10', '2026-11-11')).toBe('已逾期 1 天');
  expect(dueStatus('2026-11-11', '2026-11-11')).toBe('今天待处理');
});
test('preselects an instance, selects care history, and prevents duplicate submissions', async () => {
  let finish!: (value: unknown) => void;
  (reminderApi.create as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  render(<ReminderFormScreen instanceId="instance-1" />);
  expect(await screen.findByText('窗边这盆')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '上一次养护' }));
  fireEvent.press(screen.getByRole('button', { name: '不记得了' }));
  expect(screen.getByText(/下次提醒：/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '开启提醒' }));
  fireEvent.press(screen.getByRole('button', { name: '开启提醒' }));
  expect(reminderApi.create).toHaveBeenCalledTimes(1);
  expect(reminderApi.create).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'instance-1', careType: 'watering', interval: 1, unit: 'days', time: '09:00', lastCareChoice: 'unknown' }));
  await act(async () => finish(reminder));
  expect(router.replace).toHaveBeenCalledWith('/garden/reminders');
});
test('edits time without resubmitting relative care history', async () => {
  (reminderApi.mine as jest.Mock).mockResolvedValue([reminder]);
  render(<ReminderFormScreen reminderId="reminder-1" />);
  const time = await screen.findByDisplayValue('09:00');
  fireEvent.changeText(time, '10:30');
  fireEvent.press(screen.getByRole('button', { name: '保存提醒' }));
  await waitFor(() => expect(reminderApi.update).toHaveBeenCalledWith('reminder-1', expect.objectContaining({ time: '10:30' })));
  expect((reminderApi.update as jest.Mock).mock.calls[0][1]).not.toHaveProperty('lastCareChoice');
});
test('retains entered data after failure and retries', async () => {
  (reminderApi.create as jest.Mock).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(reminder);
  render(<ReminderFormScreen instanceId="instance-1" />);
  await screen.findByText('窗边这盆');
  fireEvent.press(screen.getByRole('button', { name: '上一次养护' }));
  fireEvent.press(screen.getByRole('button', { name: '昨天' }));
  fireEvent.press(screen.getByRole('button', { name: '开启提醒' }));
  expect(await screen.findByText('保存失败，请检查网络后重试')).toBeTruthy();
  expect(screen.getByDisplayValue('09:00')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '开启提醒' }));
  await waitFor(() => expect(reminderApi.create).toHaveBeenCalledTimes(2));
});
test('lists reminders and handles complete, edit and delete', async () => {
  (reminderApi.mine as jest.Mock).mockResolvedValue([reminder]);
  render(<RemindersList />);
  expect(await screen.findByText('窗边这盆')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '编辑提醒：窗边这盆 浇水' }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/garden/reminders/[reminderId]', params: { reminderId: 'reminder-1' } });
  fireEvent.press(screen.getByRole('button', { name: '已完成：窗边这盆 浇水' }));
  await waitFor(() => expect(reminderApi.complete).toHaveBeenCalledWith('reminder-1'));
  await waitFor(() => expect(reminderApi.mine).toHaveBeenCalledTimes(2));
  fireEvent.press(screen.getByRole('button', { name: '删除提醒：窗边这盆 浇水' }));
  await waitFor(() => expect(reminderApi.remove).toHaveBeenCalledWith('reminder-1'));
});
test('shows no-plants guidance and redirects expired sessions to login', async () => {
  (plantApi.mine as jest.Mock).mockResolvedValueOnce([]);
  const view = render(<ReminderFormScreen />);
  expect(await screen.findByText('请先在花园中添加植物')).toBeTruthy();
  view.unmount();
  (plantApi.mine as jest.Mock).mockRejectedValueOnce({ response: { status: 401 } });
  render(<ReminderFormScreen instanceId="instance-1" />);
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: '/auth', params: { returnTo: '/garden/reminders/new?instanceId=instance-1' } }));
});
