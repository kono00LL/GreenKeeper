import { Platform } from 'react-native';
import type * as NotificationTypes from 'expo-notifications';
import { notificationDate } from './notification-date';
import { careLabels, type Reminder } from '@/types/reminder';

export type NotificationStatus = 'enabled' | 'denied' | 'unsupported' | 'failed';
export const CARE_CHANNEL = 'plant-care';
const CARE_KIND = 'plant-care';
type Guard = () => boolean;
type Native = typeof NotificationTypes;
let queue: Promise<unknown> = Promise.resolve();

// Native scheduling/cancellation is serialized, so a late update cannot restore
// an alarm after deletion or account cleanup.
function run(operation: (native: Native) => Promise<NotificationStatus>): Promise<NotificationStatus> {
  if (Platform.OS !== 'android') return Promise.resolve('unsupported');
  // Load the native module only on Android; web/iOS use the explicit fallback.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const result = queue.then(() => operation(require('expo-notifications') as Native)).catch(() => 'failed' as const);
  queue = result;
  return result;
}

async function permission(native: Native, request: boolean) {
  // Android 13 needs a channel before requesting notification permission.
  await native.setNotificationChannelAsync(CARE_CHANNEL, {
    name: '植物养护提醒', importance: native.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
  });
  let permission = await native.getPermissionsAsync();
  if (!permission.granted && request && permission.canAskAgain) permission = await native.requestPermissionsAsync();
  const channel = await native.getNotificationChannelAsync(CARE_CHANNEL);
  return permission.granted && channel?.importance !== native.AndroidImportance.NONE;
}

function owned(data: Record<string, unknown> | undefined | null, userId?: string) {
  return data?.kind === CARE_KIND && (userId === undefined || data.userId === userId);
}

async function cancelWhere(native: Native, matches: (data: Record<string, unknown>) => boolean) {
  for (const request of await native.getAllScheduledNotificationsAsync()) {
    if (matches(request.content.data ?? {})) await native.cancelScheduledNotificationAsync(request.identifier);
  }
  for (const notification of await native.getPresentedNotificationsAsync()) {
    if (matches(notification.request.content.data ?? {})) await native.dismissNotificationAsync(notification.request.identifier);
  }
}

async function schedule(native: Native, reminder: Reminder, userId: string, current: Guard) {
  const date = notificationDate(reminder.nextDueDate, reminder.time, reminder.timeZone);
  if (date.getTime() <= Date.now() || !current()) return;
  const identifier = await native.scheduleNotificationAsync({
    identifier: `greenkeeper:care:${userId}:${reminder.id}`,
    content: {
      title: '植物养护提醒', body: `该给「${reminder.displayName}」${careLabels[reminder.careType]}了`,
      sound: 'default', priority: native.AndroidNotificationPriority.HIGH,
      data: { kind: CARE_KIND, userId, reminderId: reminder.id, instanceId: reminder.instanceId },
    },
    trigger: { type: native.SchedulableTriggerInputTypes.DATE, date, channelId: CARE_CHANNEL },
  });
  if (!current()) await native.cancelScheduledNotificationAsync(identifier);
}

export function configureNotifications() {
  return run(async (native) => {
    native.setNotificationHandler({ handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true,
      shouldSetBadge: false, priority: native.AndroidNotificationPriority.HIGH,
    }) });
    return 'enabled';
  });
}

export function upsertNotification(reminder: Reminder, userId: string, request = false, current: Guard = () => true) {
  return run(async (native) => {
    if (!current()) return 'enabled';
    const allowed = await permission(native, request);
    if (!current()) return 'enabled';
    await cancelWhere(native, (data) => owned(data, userId) && data.reminderId === reminder.id);
    if (!allowed) return 'denied';
    await schedule(native, reminder, userId, current);
    return 'enabled';
  });
}

export function syncNotifications(reminders: Reminder[], userId: string, current: Guard = () => true, fresh: Guard = current) {
  return run(async (native) => {
    if (!current() || !fresh()) return 'enabled';
    // Once replacement starts, finish the snapshot for this account. Mutations
    // queued behind it apply afterward; stopping halfway would lose other alarms.
    // Account changes still interrupt immediately and queue their own cleanup.
    const allowed = await permission(native, false);
    if (!current()) return 'enabled';
    // Replace the pending snapshot only; keep delivered alerts visible until the
    // user completes/deletes the task, or logs out.
    for (const request of await native.getAllScheduledNotificationsAsync()) {
      if (!current()) return 'enabled';
      if (owned(request.content.data, userId)) await native.cancelScheduledNotificationAsync(request.identifier);
    }
    if (!allowed) return 'denied';
    for (const reminder of reminders) await schedule(native, reminder, userId, current);
    const ids = new Set(reminders.map((reminder) => reminder.id));
    for (const notification of await native.getPresentedNotificationsAsync()) {
      const data = notification.request.content.data ?? {};
      if (current() && owned(data, userId) && !ids.has(String(data.reminderId))) await native.dismissNotificationAsync(notification.request.identifier);
    }
    return 'enabled';
  });
}

export function cancelReminderNotification(id: string, userId: string) {
  return run(async (native) => {
    await cancelWhere(native, (data) => owned(data, userId) && data.reminderId === id);
    return 'enabled';
  });
}

export function clearOtherAccounts(userId: string | null) {
  return run(async (native) => {
    await cancelWhere(native, (data) => owned(data) && data.userId !== userId);
    return 'enabled';
  });
}

export function cancelInstanceNotifications(instanceId: string, userId: string) {
  return run(async (native) => {
    await cancelWhere(native, (data) => owned(data, userId) && data.instanceId === instanceId);
    return 'enabled';
  });
}

export function sendTestNotification() {
  return run(async (native) => {
    if (!await permission(native, true)) return 'denied';
    await native.scheduleNotificationAsync({
      content: { title: 'GreenKeeper 测试通知', body: '系统通知已开启，可以接收植物养护提醒。', sound: 'default', priority: native.AndroidNotificationPriority.HIGH, data: { kind: 'notification-test' } },
      trigger: { channelId: CARE_CHANNEL },
    });
    return 'enabled';
  });
}
