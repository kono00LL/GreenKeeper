import { communityReturnTarget } from './community-return';

export function authReturnTarget(value: unknown) {
  if (value === '/camera') return { pathname: '/(tabs)/camera' as const };
  if (value === '/garden') return { pathname: '/(tabs)/garden' as const };
  if (value === '/garden/reminders') return { pathname: '/garden/reminders' as const };
  if (typeof value === 'string') {
    const newReminder = value.match(/^\/garden\/reminders\/new(?:\?instanceId=([a-zA-Z0-9_-]+))?$/);
    if (newReminder) {
      return newReminder[1]
        ? { pathname: '/garden/reminders/new' as const, params: { instanceId: newReminder[1] } }
        : { pathname: '/garden/reminders/new' as const };
    }
    const editReminder = value.match(/^\/garden\/reminders\/([a-zA-Z0-9_-]+)$/);
    if (editReminder) return { pathname: '/garden/reminders/[reminderId]' as const, params: { reminderId: editReminder[1] } };
  }
  if (typeof value === 'string' && /^\/plants\/[a-zA-Z0-9_-]+$/.test(value)) {
    return { pathname: '/plants/[id]' as const, params: { id: value.slice('/plants/'.length) } };
  }
  return communityReturnTarget(value);
}
