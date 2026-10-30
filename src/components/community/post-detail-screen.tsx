import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { postStore, usePostStore } from '@/store/post-store';
import { idleDetail } from '@/store/post-state';
import { colors } from '@/constants/color';
import { CommunityText } from './community-text';
import { CollectionButton } from './collection-button';
import { LoadState } from './load-state';
import { PostGallery } from './post-gallery';
export function PostDetailScreen({ id }: { id: string }) {
  const post = usePostStore((s) => s.entities[id]);
  const detail = usePostStore((s) => s.details[id] ?? idleDetail);
  const session = useAuthStore((s) => s.sessionVersion);
  useFocusEffect(
    useCallback(() => {
      if (id && useAuthStore.getState().sessionVersion === session)
        void postStore.getState().loadDetail(id);
      return () => {
        if (id) postStore.getState().cancelDetail(id);
      };
    }, [id, session]),
  );
  const reload = () => {
    void postStore.getState().loadDetail(id);
  };
  const missing = !id || detail.status === 'missing';
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回社区"
          style={styles.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/post'))}
        >
          <CommunityText>‹ 返回</CommunityText>
        </Pressable>
        <CommunityText bold style={styles.heading}>
          帖子详情
        </CommunityText>
        <View style={styles.balance} />
      </View>
      {missing ? (
        <LoadState message="帖子不存在或已删除" />
      ) : !post ? (
        detail.status === 'error' ? (
          <LoadState message={detail.error ?? '加载失败，请重试'} retry={reload} />
        ) : (
          <LoadState loading message="正在加载帖子…" />
        )
      ) : (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.body}
            refreshControl={
              <RefreshControl
                refreshing={detail.refreshing}
                onRefresh={reload}
                tintColor={colors.selectedText}
                colors={[colors.selectedText]}
              />
            }
          >
            {detail.error && <LoadState message={detail.error} retry={reload} />}
            <PostGallery key={id} images={post.images} />
            <CommunityText bold style={styles.title}>
              {post.title}
            </CommunityText>
            <CommunityText style={styles.text}>{post.content}</CommunityText>
          </ScrollView>
          <View style={styles.footer}>
            <CollectionButton postId={id} returnTo={`/posts/${encodeURIComponent(id)}`} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1 },
  body: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    minHeight: 56,
    paddingHorizontal: 8,
  },
  back: { minHeight: 44, minWidth: 70, justifyContent: 'center' },
  balance: { width: 70 },
  heading: { fontSize: 16 },
  title: { fontSize: 28, lineHeight: 38, marginHorizontal: 12, marginTop: 20, marginBottom: 16 },
  text: { fontSize: 18, lineHeight: 28, color: colors.secondaryText, paddingHorizontal: 24 },
  footer: {
    minHeight: 60,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: colors.selectedBackground,
    borderTopWidth: 1,
    borderColor: colors.divider,
  },
});
