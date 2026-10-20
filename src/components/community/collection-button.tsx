import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { usePostStore, postStore } from '@/store/post-store';
import { colors } from '@/constants/color';
import { CommunityText } from './community-text';
export function CollectionButton({ postId, returnTo }: { postId: string; returnTo: string }) {
  const post = usePostStore((s) => s.entities[postId]);
  const operation = usePostStore((s) => s.collections[postId]);
  const authenticated = useAuthStore((s) => s.status === 'authenticated');
  if (!post) return null;
  const login = () => router.push({ pathname: '/auth', params: { returnTo } });
  const label = post.collected ? '取消收藏' : '收藏';
  const onPress = async () => {
    if (!authenticated) {
      login();
      return;
    }
    const result = await postStore.getState().toggleCollection(postId);
    if (result === 'login' || useAuthStore.getState().status !== 'authenticated') login();
  };
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}，${post.collectionCount} 人收藏`}
        accessibilityState={{
          selected: post.collected,
          disabled: Boolean(operation?.pending),
          busy: Boolean(operation?.pending),
        }}
        disabled={operation?.pending}
        onPress={() => void onPress()}
        style={styles.button}
      >
        {operation?.pending ? (
          <ActivityIndicator size="small" color={colors.selectedText} />
        ) : (
          <Image
            source={
              post.collected
                ? require('@/assets/icons/collected.svg')
                : require('@/assets/icons/collect.svg')
            }
            style={styles.icon}
          />
        )}
        <CommunityText style={[styles.label, post.collected && styles.selected]}>
          {label} {post.collectionCount}
        </CommunityText>
      </Pressable>
      {operation?.error && (
        <CommunityText accessibilityRole="alert" style={styles.error}>
          {operation.error}
        </CommunityText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  icon: { width: 23, height: 23 },
  label: { color: colors.secondaryText, fontSize: 13 },
  selected: { color: colors.selectedText },
  error: { color: colors.danger, fontSize: 12, paddingHorizontal: 4, paddingBottom: 6 },
});
