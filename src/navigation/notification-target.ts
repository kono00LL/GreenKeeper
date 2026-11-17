export function notificationTarget(data: Record<string, unknown>, userId: string | null) {
  if (data.kind === 'notification-test') return { pathname: '/garden/reminders' as const };
  if (data.kind !== 'plant-care' || typeof data.reminderId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(data.reminderId) || typeof data.userId !== 'string') return null;
  if (!userId) return { pathname: '/auth' as const, params: { returnTo: `/garden/reminders/${data.reminderId}` } };
  if (data.userId !== userId) return { pathname: '/garden/reminders' as const };
  return { pathname: '/garden/reminders/[reminderId]' as const, params: { reminderId: data.reminderId } };
}
