import { reminderApi } from './reminder-api';
import { cancelInstanceNotifications, cancelReminderNotification, clearOtherAccounts, syncNotifications, upsertNotification, type NotificationStatus } from './reminder-notifications';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationState } from '@/store/notification-state';
import type { Reminder } from '@/types/reminder';

let revision = 0;
function session() {
  const { user, status, sessionVersion } = useAuthStore.getState();
  const userId = status === 'authenticated' ? user?.user_id : undefined;
  return { userId, current: () => {
    const latest = useAuthStore.getState();
    return latest.status === 'authenticated' && latest.user?.user_id === userId && latest.sessionVersion === sessionVersion;
  } };
}
function report(status: NotificationStatus, current: () => boolean) {
  if (current()) useNotificationState.setState({ status });
  return status;
}

export async function refreshReminderNotifications() {
  const { userId, current } = session();
  if (!userId) return;
  const version = ++revision;
  const valid = () => current() && revision === version;
  try {
    const reminders = await reminderApi.mine();
    if (valid()) report(await syncNotifications(reminders, userId, current, valid), valid);
  } catch {
    // A failed GET must not discard the previously scheduled offline reminders.
    if (valid()) useNotificationState.setState({ status: 'failed' });
  }
}

export function notificationAccountChanged() {
  revision += 1;
  useNotificationState.setState({ status: 'idle' });
  const { userId } = session();
  void clearOtherAccounts(userId ?? null).then((status) => {
    if (status === 'failed') useNotificationState.setState({ status });
  });
  return refreshReminderNotifications();
}

export async function savedReminderNotification(reminder: Reminder, requestPermission = false) {
  revision += 1;
  const { userId, current } = session();
  if (!userId) return 'unsupported' as const;
  return report(await upsertNotification(reminder, userId, requestPermission, current), current);
}

export async function removedReminderNotification(id: string) {
  revision += 1;
  const { userId, current } = session();
  if (userId) report(await cancelReminderNotification(id, userId), current);
}

export async function removedInstanceNotifications(id: string) {
  revision += 1;
  const { userId, current } = session();
  if (userId) report(await cancelInstanceNotifications(id, userId), current);
}
