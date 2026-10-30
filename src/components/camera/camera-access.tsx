import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function CameraAccess({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  if (status === 'checking') return null;
  if (status !== 'authenticated') {
    return <Redirect href={{ pathname: '/auth', params: { returnTo: '/camera' } }} />;
  }
  return children;
}
