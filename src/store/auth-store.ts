import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  getCurrentUser,
  logout as logoutRequest,
  refreshSession as refreshSessionRequest,
} from '@/services/auth-api';
import type { AuthStatus, User } from '@/types/auth';

type AuthState = {
  sessionVersion: number;
  status: AuthStatus;
  hydrated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  bootstrap: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setSession: (user: User, accessToken: string, refreshToken: string) => void;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
  clearSession: () => void;
  markHydrated: () => void;
};

let bootstrapPromise: Promise<void> | null = null;
let resolveHydration: (() => void) | null = null;
const hydrationReady = new Promise<void>((resolve) => {
  resolveHydration = resolve;
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionVersion: 0,
      status: 'checking',
      hydrated: false,
      user: null,
      accessToken: null,
      refreshToken: null,

      markHydrated: () => {
        set({ hydrated: true });
        resolveHydration?.();
        resolveHydration = null;
      },

      setSession: (user, accessToken, refreshToken) => {
        set({ status: 'authenticated', user, accessToken, refreshToken, sessionVersion: get().sessionVersion + 1 });
      },

      updateUser: (user) => set({ user }),

      clearSession: () => {
        set({ status: 'unauthenticated', user: null, accessToken: null, refreshToken: null, sessionVersion: get().sessionVersion + 1 });
      },

      refreshSession: async () => {
        const version = get().sessionVersion;
        const currentRefreshToken = get().refreshToken;
        if (!currentRefreshToken) {
          get().clearSession();
          return false;
        }

        try {
          const tokens = await refreshSessionRequest(currentRefreshToken);
          if (get().sessionVersion !== version) return false;
          set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });

          try {
            const user = await getCurrentUser(true);
            if (get().sessionVersion !== version) return false;
            set({ status: 'authenticated', user });
          } catch {
            if (get().sessionVersion !== version) return false;
            // A valid session can survive a temporary profile/network failure.
            set({ status: 'authenticated' });
          }
          return true;
        } catch {
          if (get().sessionVersion === version) get().clearSession();
          return false;
        }
      },

      bootstrap: async () => {
        if (bootstrapPromise) return bootstrapPromise;
        bootstrapPromise = (async () => {
          if (!get().hydrated) await hydrationReady;
          if (!get().refreshToken) {
            get().clearSession();
            return;
          }
          await get().refreshSession();
        })().finally(() => {
          bootstrapPromise = null;
        });
        return bootstrapPromise;
      },

      logout: async () => {
        const version = get().sessionVersion;
        const token = get().refreshToken || get().accessToken;
        try {
          if (token) await logoutRequest(token);
        } finally {
          if (get().sessionVersion === version) get().clearSession();
        }
      },
    }),
    {
      name: 'greenkeeper-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
