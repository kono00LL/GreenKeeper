import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { usePostStore, postStore } from '@/store/post-store';
import { colors } from '@/constants/color';
import { CommunityHeader } from './community-header';
import { PostCard } from './post-card';
import { LoadState } from './load-state';
export function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [availableHeight, setAvailableHeight] = useState(0);
  const feed = usePostStore((s) => s.feed);
  const session = useAuthStore((s) => s.sessionVersion);
  useFocusEffect(
    useCallback(() => {
      if (useAuthStore.getState().sessionVersion === session) void postStore.getState().loadFeed();
    }, [session]),
  );
  const refresh = () => {
    void postStore.getState().loadFeed(true);
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      {/* Matches the existing absolute tab bar, without changing its layout or appearance. */}
      <View
        style={[styles.content, { marginBottom: 64 + insets.bottom }]}
        onLayout={(e) => setAvailableHeight(e.nativeEvent.layout.height)}
      >
        <CommunityHeader height={availableHeight * 0.15} />
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={feed.refreshing && feed.ids.length > 0}
              onRefresh={refresh}
              tintColor={colors.selectedText}
              colors={[colors.selectedText]}
            />
          }
          onScroll={({ nativeEvent: e }) => {
            if (
              e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - 120 &&
              !feed.moreError
            )
              void postStore.getState().loadMore();
          }}
          scrollEventThrottle={100}
        >
          {feed.ids.length === 0 ? (
            feed.status === 'loading' || feed.status === 'idle' ? (
              <LoadState loading message="正在加载帖子…" />
            ) : feed.error ? (
              <LoadState message={feed.error} retry={refresh} />
            ) : (
              <LoadState message="还没有帖子" retry={refresh} retryLabel="刷新" />
            )
          ) : (
            <>
              {feed.error && <LoadState message={feed.error} retry={refresh} />}
              <View style={styles.columns}>
                {[0, 1].map((column) => (
                  <View key={column} style={[styles.column, column === 0 && styles.leftColumn]}>
                    {feed.ids
                      .filter((_, i) => i % 2 === column)
                      .map((id) => (
                        <PostCard key={id} id={id} />
                      ))}
                  </View>
                ))}
              </View>
              {feed.loadingMore ? (
                <LoadState loading message="正在加载更多…" />
              ) : feed.moreError ? (
                <LoadState
                  message={feed.moreError}
                  retry={() => void postStore.getState().loadMore()}
                  retryLabel="重试加载更多"
                />
              ) : !feed.hasMore ? (
                <LoadState message="已经到底了" />
              ) : (
                <LoadState
                  message="继续浏览更多帖子"
                  retry={() => void postStore.getState().loadMore()}
                  retryLabel="加载更多"
                />
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 8, paddingBottom: 12 },
  columns: { flexDirection: 'row', gap: 8 },
  column: { flex: 1 },
  leftColumn: { paddingTop: 8 },
});
