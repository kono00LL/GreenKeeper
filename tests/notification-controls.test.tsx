import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { NotificationControls } from '@/components/garden/notification-controls';
import { sendTestNotification } from '@/services/reminder-notifications';
import { refreshReminderNotifications } from '@/services/reminder-notification-sync';
import { useNotificationState } from '@/store/notification-state';
import { reminderApi } from '@/services/reminder-api';

jest.mock('@/services/reminder-notifications', () => ({ sendTestNotification: jest.fn() }));
jest.mock('@/services/reminder-notification-sync', () => ({ refreshReminderNotifications: jest.fn() }));
jest.mock('@/services/reminder-api', () => ({ reminderApi: { create: jest.fn(), update: jest.fn(), complete: jest.fn(), remove: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); useNotificationState.setState({ status: 'idle' }); });

test('sends a test immediately, prevents duplicate clicks and never writes a backend plan', async () => {
  let finish!: (status: string) => void;
  (sendTestNotification as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  render(<NotificationControls />);
  fireEvent.press(screen.getByRole('button', { name: '发送测试通知' }));
  fireEvent.press(screen.getByRole('button', { name: '发送测试通知' }));
  expect(sendTestNotification).toHaveBeenCalledTimes(1);
  await act(async () => finish('enabled'));
  expect(await screen.findByText('已发送测试通知，请查看系统通知栏。')).toBeTruthy();
  expect(refreshReminderNotifications).toHaveBeenCalledTimes(1);
  for (const mutation of Object.values(reminderApi)) expect(mutation).not.toHaveBeenCalled();
});

test('explains denied permissions and links to Android settings', async () => {
  (sendTestNotification as jest.Mock).mockResolvedValueOnce('denied');
  const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  render(<NotificationControls />);
  fireEvent.press(screen.getByRole('button', { name: '发送测试通知' }));
  fireEvent.press(await screen.findByRole('button', { name: '打开通知设置' }));
  expect(open).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/养护计划仍已保存/)).toBeTruthy();
  open.mockRestore();
});

test('explains unsupported platforms and lets failures be retried', async () => {
  (sendTestNotification as jest.Mock).mockResolvedValueOnce('unsupported').mockResolvedValueOnce('failed').mockResolvedValueOnce('enabled');
  render(<NotificationControls />);
  fireEvent.press(screen.getByRole('button', { name: '发送测试通知' }));
  expect(await screen.findByText(/系统通知仅支持 Android/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '发送测试通知' }));
  expect(await screen.findByText(/系统通知同步失败/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: '发送测试通知' }));
  await waitFor(() => expect(sendTestNotification).toHaveBeenCalledTimes(3));
  expect(await screen.findByText('已发送测试通知，请查看系统通知栏。')).toBeTruthy();
});
