// Only community destinations are accepted; external URLs and unrelated screens are rejected.
export function communityReturnTarget(value: unknown) {
  if (value === '/post') return { pathname: '/(tabs)/post' as const };
  if (typeof value === 'string' && /^\/posts\/[a-zA-Z0-9_-]+$/.test(value)) {
    return {
      pathname: '/posts/[post-id]' as const,
      params: { 'post-id': value.slice('/posts/'.length) },
    };
  }
  return null;
}
