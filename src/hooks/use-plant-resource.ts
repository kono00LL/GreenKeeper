import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { statusOf } from '@/services/post-errors';

type ResourceState<T> = {
  key: string;
  data: T | null;
  loading: boolean;
  error: { status?: number } | null;
};

// Ignore responses from a blurred screen, an older route, or an older refresh.
export function usePlantResource<T>(key: string, fetcher: () => Promise<T>) {
  const requestVersion = useRef(0);
  const [state, setState] = useState<ResourceState<T>>({ key, data: null, loading: true, error: null });

  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    setState((previous) => ({
      key, data: previous.key === key ? previous.data : null, loading: true, error: null,
    }));
    try {
      const data = await fetcher();
      if (version !== requestVersion.current) return;
      setState({ key, data, loading: false, error: null });
    } catch (error) {
      if (version !== requestVersion.current) return;
      const status = statusOf(error);
      setState((previous) => ({
        key,
        data: status === 400 || status === 404 ? null : previous.data,
        loading: false,
        error: { status },
      }));
    }
  }, [fetcher, key]);

  useFocusEffect(useCallback(() => {
    void reload();
    return () => { requestVersion.current += 1; };
  }, [reload]));

  return {
    data: state.key === key ? state.data : null,
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : null,
    reload,
  };
}
