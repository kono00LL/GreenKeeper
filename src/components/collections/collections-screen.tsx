import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/color';
import { getCollections } from '@/services/post-api';
import { postErrorMessage } from '@/services/post-errors';
import { useAuthStore } from '@/store/auth-store';
import type { CollectionCategory, Post } from '@/types/post';
import { CommunityText } from '@/components/community/community-text';
import { LoadState } from '@/components/community/load-state';
import { CollectionCard } from './collection-card';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
const categories: { key: CollectionCategory; label: string }[] = [
  { key: 'article', label: '文章' },
  { key: 'encyclopedia', label: '百科' },
];

export function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const status = useAuthStore((state) => state.status);
  const [category, setCategory] = useState<CollectionCategory>('article');
  const [items, setItems] = useState<Post[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const version = ++requestVersion.current;
    if (category === 'encyclopedia') {
      setItems([]);
      setError(null);
      setLoadStatus('ready');
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoadStatus('loading');
    setError(null);
    try {
      const result = await getCollections(category);
      if (version !== requestVersion.current) return;
      setItems(result);
      setLoadStatus('ready');
    } catch (requestError) {
      if (version !== requestVersion.current) return;
      setError(postErrorMessage(requestError));
      setLoadStatus('error');
    } finally {
      if (version === requestVersion.current) setRefreshing(false);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      if (status === 'unauthenticated') {
        router.replace('/auth');
        return;
      }
      if (status === 'authenticated') void load();
    }, [load, status]),
  );

  const selectCategory = (next: CollectionCategory) => {
    if (next === category) return;
    requestVersion.current += 1;
    setCategory(next);
    setItems([]);
    setRefreshing(false);
    setError(null);
    setLoadStatus('idle');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回" hitSlop={12} onPress={() => router.back()} style={styles.backButton}>
          <CommunityText style={styles.back}>‹</CommunityText>
        </Pressable>
        <CommunityText bold style={styles.headerTitle}>我的收藏</CommunityText>
        <View style={styles.headerBalance} />
      </View>

      <View style={styles.tabs}>
        {categories.map((item) => {
          const selected = item.key === category;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => selectCategory(item.key)}
              style={styles.tab}>
              <CommunityText style={[styles.tabLabel, selected && styles.selectedTabLabel]}>
                {item.label}
              </CommunityText>
              {selected && <View style={styles.indicator} />}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: 16 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.selectedText}
            colors={[colors.selectedText]}
          />
        }>
        {category === 'encyclopedia' ? (
          <LoadState message="百科收藏暂未开放" />
        ) : loadStatus === 'loading' || loadStatus === 'idle' ? (
          <LoadState loading message="正在加载收藏…" />
        ) : error ? (
          <LoadState message={error} retry={() => void load(true)} />
        ) : items.length === 0 ? (
          <LoadState message="还没有收藏文章" />
        ) : (
          <View style={styles.columns}>
            {[0, 1].map((column) => (
              <View key={column} style={[styles.column, column === 0 && styles.leftColumn]}>
                {items.filter((_, index) => index % 2 === column).map((post) => (
                  <CollectionCard key={post.id} post={post} />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 12,
  },
  backButton: { justifyContent: 'center', minHeight: 44, minWidth: 76 },
  back: { fontSize: 32, lineHeight: 38 },
  headerTitle: { fontSize: 17 },
  headerBalance: { width: 76 },
  tabs: { backgroundColor: colors.white, borderBottomColor: colors.divider, borderBottomWidth: 1, flexDirection: 'row', height: 46 },
  tab: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  tabLabel: { color: colors.muted, fontSize: 15 },
  selectedTabLabel: { color: colors.selectedText, fontWeight: '700' },
  indicator: { backgroundColor: colors.primary, bottom: 0, height: 2, left: 0, position: 'absolute', right: 0 },
  list: { flex: 1 },
  listContent: { flexGrow: 1, paddingHorizontal: 8, paddingTop: 12 },
  columns: { flexDirection: 'row', gap: 8 },
  column: { flex: 1 },
  leftColumn: { paddingTop: 8 },
});
