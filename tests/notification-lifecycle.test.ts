import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { startNotificationLifecycle } from '@/services/notification-lifecycle';
import { notificationTarget } from '@/navigation/notification-target';
import { useAuthStore } from '@/store/auth-store';
import { notificationAccountChanged, refreshReminderNotifications } from '@/services/reminder-notification-sync';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(), getLastNotificationResponse: jest.fn(), clearLastNotificationResponse: jest.fn(),
}));
jest.mock('@/services/reminder-notifications', () => ({ configureNotifications: jest.fn() }));
jest.mock('@/services/reminder-notification-sync', () => ({ notificationAccountChanged: jest.fn(), refreshReminderNotifications: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
  useAuthStore.getState().setSession({ user_id: 'user1' } as never, 'access', 'refresh');
});

test('routes valid care notifications to edit or login and rejects arbitrary destinations', () => {
  const data = { kind: 'plant-care', userId: 'user1', reminderId: 'r1' };
  expect(notificationTarget(data, 'user1')).toEqual({ pathname: '/garden/reminders/[reminderId]', params: { reminderId: 'r1' } });
  expect(notificationTarget(data, null)).toEqual({ pathname: '/auth', params: { returnTo: '/garden/reminders/r1' } });
  expect(notificationTarget(data, 'user2')).toEqual({ pathname: '/garden/reminders' });
  expect(notificationTarget({ ...data, reminderId: 'https://untrusted.example' }, 'user1')).toBeNull();
  expect(notificationTarget({ kind: 'notification-test' }, null)).toEqual({ pathname: '/garden/reminders' });
});

test('handles cold and warm notification taps once, foreground sync, logout and cleanup', () => {
  const response = { notification: { request: { identifier: 'notification1', content: { data: { kind: 'plant-care', userId: 'user1', reminderId: 'r1' } } } } };
  const removeResponse = jest.fn(); const removeAppState = jest.fn();
  (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(response);
  (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({ remove: removeResponse });
  const appState = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: removeAppState });
  const cleanup = startNotificationLifecycle();
  expect(router.push).toHaveBeenCalledTimes(1);
  const receive = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls[0][0];
  receive(response);
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
  receive({ ...response, notification: { ...response.notification, date: 20300101 } });
  expect(router.push).toHaveBeenCalledTimes(2);
  appState.mock.calls[0][1]('active');
  expect(refreshReminderNotifications).toHaveBeenCalledTimes(1);
  useAuthStore.getState().clearSession();
  expect(notificationAccountChanged).toHaveBeenCalledTimes(2);
  cleanup();
  expect(removeResponse).toHaveBeenCalledTimes(1); expect(removeAppState).toHaveBeenCalledTimes(1);
  appState.mockRestore();
});
