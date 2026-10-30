import { useAuthStore } from '@/store/auth-store';
import { refreshSession, getCurrentUser } from '@/services/auth-api';
import type { User } from '@/types/auth';
jest.mock('@/services/auth-api', () => ({
  refreshSession: jest.fn(),
  getCurrentUser: jest.fn(),
  logout: jest.fn(),
}));
const user = { user_id: 'a' } as User;
test('a late refresh must not restore a signed-out session', async () => {
  let resolve!: (v: unknown) => void;
  (refreshSession as jest.Mock).mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  useAuthStore.getState().setSession(user, 'old-access', 'old-refresh');
  const pending = useAuthStore.getState().refreshSession();
  useAuthStore.getState().clearSession();
  resolve({ access_token: 'late', refresh_token: 'late' });
  await pending;
  expect(useAuthStore.getState().accessToken).toBeNull();
  expect(useAuthStore.getState().status).toBe('unauthenticated');
});
test('a late profile response cannot overwrite a newly signed-in user', async () => {
  let resolve!: (v: unknown) => void;
  (refreshSession as jest.Mock).mockResolvedValueOnce({
    access_token: 'new',
    refresh_token: 'new',
  });
  (getCurrentUser as jest.Mock).mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  useAuthStore.getState().setSession(user, 'old-access', 'old-refresh');
  const pending = useAuthStore.getState().refreshSession();
  await Promise.resolve();
  useAuthStore.getState().setSession({ ...user, user_id: 'b' }, 'b', 'b');
  resolve(user);
  await pending;
  expect(useAuthStore.getState().user?.user_id).toBe('b');
});
