import { DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (hydrated) void bootstrap();
  }, [bootstrap, hydrated]);

  useEffect(() => {
    if (hydrated && status !== 'checking') {
      void SplashScreen.hideAsync();
    }
  }, [hydrated, status]);

  if (!hydrated || status === 'checking') return null;

  return (
    <ThemeProvider value={DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}
