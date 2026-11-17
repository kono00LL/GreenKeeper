import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { useAuthStore } from '@/store/auth-store';
import { notificationAccountChanged, refreshReminderNotifications } from './reminder-notification-sync';
import { configureNotifications } from './reminder-notifications';
import { notificationTarget } from '@/navigation/notification-target';

export function startNotificationLifecycle() {
  if (Platform.OS !== 'android') return () => {};
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Android-only native module.
  const native: typeof import('expo-notifications') = require('expo-notifications');
  void configureNotifications();
  let handledResponse: string | undefined;
  const open = (response: NotificationResponse | null) => {
    if (!response) return;
    // The same reminder keeps its identifier across later care cycles.
    const id = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
    if (handledResponse === id) return;
    handledResponse = id;
    const { status, user } = useAuthStore.getState();
    const target = notificationTarget(response.notification.request.content.data ?? {}, status === 'authenticated' ? user?.user_id ?? null : null);
    if (target) router.push(target);
    native.clearLastNotificationResponse();
  };
  const responseListener = native.addNotificationResponseReceivedListener(open);
  open(native.getLastNotificationResponse());
  void notificationAccountChanged();
  const unsubscribe = useAuthStore.subscribe((state, previous) => {
    if (state.status !== previous.status || state.sessionVersion !== previous.sessionVersion) void notificationAccountChanged();
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void refreshReminderNotifications();
  });
  return () => { responseListener.remove(); appState.remove(); unsubscribe(); };
}
