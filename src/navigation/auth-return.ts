import { communityReturnTarget } from './community-return';

export function authReturnTarget(value: unknown) {
  if (value === '/camera') return { pathname: '/(tabs)/camera' as const };
  return communityReturnTarget(value);
}
