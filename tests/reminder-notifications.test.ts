import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { notificationDate } from '@/services/notification-date';
import { syncNotifications, upsertNotification, cancelReminderNotification, clearOtherAccounts, sendTestNotification, configureNotifications } from '@/services/reminder-notifications';
import type { Reminder } from '@/types/reminder';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4, NONE: 0 },
  AndroidNotificationPriority: { HIGH: 'high' },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(), cancelScheduledNotificationAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(), dismissNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

export const reminder = {
  id: 'r1', instanceId: 'i1', plantId: 'p1', displayName: '窗边这盆', careType: 'watering',
  interval: 2, unit: 'days', time: '09:00', timeZone: 'Asia/Taipei', lastCareChoice: 'unknown',
  lastCareDate: null, anchorDate: '2030-01-01', nextDueDate: '2030-01-03', createdAt: '', updatedAt: '',
} satisfies Reminder;
const request = (id: string, userId = 'user1', reminderId = 'r1') => ({ identifier: id, content: { data: { kind: 'plant-care', userId, reminderId } } });
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true, canAskAgain: true });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Notifications.getNotificationChannelAsync as jest.Mock).mockResolvedValue({ importance: 4 });
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
  (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValue([]);
  (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('test-id');
});

test('uses the saved IANA zone, including cross-day conversion, gaps and folds', () => {
  expect(notificationDate('2030-01-03', '09:00', 'Asia/Taipei').toISOString()).toBe('2030-01-03T01:00:00.000Z');
  expect(notificationDate('2030-01-03', '01:00', 'Asia/Taipei').toISOString()).toBe('2030-01-02T17:00:00.000Z');
  expect(notificationDate('2026-03-08', '02:30', 'America/New_York').toISOString()).toBe('2026-03-08T07:00:00.000Z');
  expect(notificationDate('2026-11-01', '01:30', 'America/New_York').toISOString()).toBe('2026-11-01T05:30:00.000Z');
});

test('schedules a single future notification and replaces old requests on edit or completion', async () => {
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([request('old')]);
  expect(await upsertNotification(reminder, 'user1', true)).toBe('enabled');
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    content: expect.objectContaining({ body: expect.stringContaining('窗边这盆'), data: expect.objectContaining({ reminderId: 'r1', userId: 'user1', instanceId: 'i1' }) }),
    trigger: { type: 'date', date: new Date('2030-01-03T01:00:00Z'), channelId: 'plant-care' },
  }));
  await upsertNotification({ ...reminder, nextDueDate: '2030-01-05' }, 'user1');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenLastCalledWith(expect.objectContaining({ trigger: expect.objectContaining({ date: new Date('2030-01-05T01:00:00Z') }) }));
});

test('synchronizes deletion and skips past reminders without rolling them forward', async () => {
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([request('removed', 'user1', 'deleted')]);
  await syncNotifications([{ ...reminder, nextDueDate: '2000-01-01' }], 'user1');
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('removed');
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('cancels the selected reminder only and clears previous accounts on logout', async () => {
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([request('one'), request('two', 'user2'), { identifier: 'unrelated', content: { data: {} } }]);
  await cancelReminderNotification('r1', 'user1');
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('one');
  jest.clearAllMocks();
  await clearOtherAccounts(null);
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
});

test('requests permission only for user actions and keeps denied plans unscheduled', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
  expect(await syncNotifications([reminder], 'user1')).toBe('denied');
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  expect(await upsertNotification(reminder, 'user1', true)).toBe('denied');
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('sends an immediate test through the same high importance channel and handles errors', async () => {
  expect(await sendTestNotification()).toBe('enabled');
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('plant-care', expect.objectContaining({ importance: 4 }));
  const channel = (Notifications.setNotificationChannelAsync as jest.Mock).mock.calls[0][1];
  expect(channel).not.toHaveProperty('sound');
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ content: expect.objectContaining({ title: 'GreenKeeper 测试通知' }), trigger: { channelId: 'plant-care' } }));
  (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(new Error('native failed'));
  expect(await sendTestNotification()).toBe('failed');
});

test('requests permission for an immediate test and respects a blocked channel or permanent denial', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: true });
  expect(await sendTestNotification()).toBe('enabled');
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  (Notifications.getNotificationChannelAsync as jest.Mock).mockResolvedValue({ importance: 0 });
  expect(await sendTestNotification()).toBe('denied');
  jest.clearAllMocks();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false, canAskAgain: false });
  expect(await sendTestNotification()).toBe('denied');
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('does not touch native notifications on other platforms', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  expect(await sendTestNotification()).toBe('unsupported');
  expect(await syncNotifications([reminder], 'user1')).toBe('unsupported');
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('does not schedule stale data after switching accounts mid-request', async () => {
  let current = true;
  (Notifications.getPermissionsAsync as jest.Mock).mockImplementationOnce(async () => { current = false; return { granted: true }; });
  await upsertNotification(reminder, 'user1', false, () => current);
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('finishes an active snapshot before a queued mutation, but skips snapshots superseded before starting', async () => {
  let fresh = true;
  (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([request('old')]);
  (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockImplementationOnce(async () => { fresh = false; });
  await syncNotifications([reminder, { ...reminder, id: 'r2' }], 'user1', () => true, () => fresh);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  jest.clearAllMocks();
  await syncNotifications([reminder], 'user1', () => true, () => fresh);
  expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test('enables foreground banners and sound', async () => {
  await configureNotifications();
  const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0];
  expect(await handler.handleNotification()).toEqual(expect.objectContaining({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true }));
});
