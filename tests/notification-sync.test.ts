import { refreshReminderNotifications, notificationAccountChanged, savedReminderNotification, removedReminderNotification, removedInstanceNotifications } from '@/services/reminder-notification-sync';
import { reminderApi } from '@/services/reminder-api';
import { syncNotifications, upsertNotification, clearOtherAccounts, cancelReminderNotification, cancelInstanceNotifications } from '@/services/reminder-notifications';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationState } from '@/store/notification-state';
import type { Reminder } from '@/types/reminder';

jest.mock('@/services/reminder-api', () => ({ reminderApi: { mine: jest.fn() } }));
jest.mock('@/services/reminder-notifications', () => ({
  syncNotifications: jest.fn(), upsertNotification: jest.fn(), clearOtherAccounts: jest.fn(),
  cancelReminderNotification: jest.fn(), cancelInstanceNotifications: jest.fn(),
}));
const reminder = { id: 'r1', instanceId: 'i1' } as Reminder;
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().setSession({ user_id: 'user1' } as never, 'access', 'refresh');
  (reminderApi.mine as jest.Mock).mockResolvedValue([reminder]);
  for (const fn of [syncNotifications, upsertNotification, clearOtherAccounts, cancelReminderNotification, cancelInstanceNotifications]) (fn as jest.Mock).mockResolvedValue('enabled');
});

test('syncs backend plans after login and clears previous accounts', async () => {
  await notificationAccountChanged();
  expect(clearOtherAccounts).toHaveBeenCalledWith('user1');
  expect(syncNotifications).toHaveBeenCalledWith([reminder], 'user1', expect.any(Function), expect.any(Function));
  expect(useNotificationState.getState().status).toBe('enabled');
  useAuthStore.getState().clearSession();
  await notificationAccountChanged();
  expect(clearOtherAccounts).toHaveBeenLastCalledWith(null);
});

test('updates saved reminders and cancels removed reminders and instances', async () => {
  await savedReminderNotification(reminder, true);
  expect(upsertNotification).toHaveBeenCalledWith(reminder, 'user1', true, expect.any(Function));
  await removedReminderNotification('r1');
  await removedInstanceNotifications('i1');
  expect(cancelReminderNotification).toHaveBeenCalledWith('r1', 'user1');
  expect(cancelInstanceNotifications).toHaveBeenCalledWith('i1', 'user1');
});

test('a stale GET cannot restore an old schedule after a mutation or account change', async () => {
  let finish!: (value: Reminder[]) => void;
  (reminderApi.mine as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const refresh = refreshReminderNotifications();
  await removedReminderNotification('r1');
  finish([reminder]); await refresh;
  expect(syncNotifications).not.toHaveBeenCalled();
  (reminderApi.mine as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const oldAccount = refreshReminderNotifications();
  useAuthStore.getState().clearSession();
  finish([reminder]); await oldAccount;
  expect(syncNotifications).not.toHaveBeenCalled();
});

test('network errors preserve existing schedules and expose a retry status', async () => {
  (reminderApi.mine as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  await refreshReminderNotifications();
  expect(syncNotifications).not.toHaveBeenCalled();
  expect(useNotificationState.getState().status).toBe('failed');
});

test('separates account validity from snapshot freshness during serialized native work', async () => {
  await refreshReminderNotifications();
  const [, , current, fresh] = (syncNotifications as jest.Mock).mock.calls[0];
  await savedReminderNotification(reminder);
  expect(current()).toBe(true);
  expect(fresh()).toBe(false);
  useAuthStore.getState().clearSession();
  expect(current()).toBe(false);
});
