import { useStore } from 'zustand';
import { createPostStore, type PostState } from '@/store/post-state';
import { useAuthStore } from '@/store/auth-store';
import { postApi } from '@/services/post-api';

export const postStore = createPostStore(postApi);
// Synchronous subscription invalidates in-flight requests before their promises can settle.
useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) postStore.getState().resetSession();
});
export function usePostStore<T>(selector: (state: PostState) => T): T {
  return useStore(postStore, selector);
}
