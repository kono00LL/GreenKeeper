import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePostStore } from '@/store/post-store';
import { colors } from '@/constants/color';
import { CommunityText } from './community-text';
import { CollectionButton } from './collection-button';
import { PostImageView } from './post-image';
export function PostCard({ id }: { id: string }) {
  const post = usePostStore((s) => s.entities[id]);
  const [width, setWidth] = useState(170);
  const [measured, setMeasured] = useState<{ url: string; ratio: number } | null>(null);
  if (!post) return null;
  const cover = post.images[0];
  const ratio =
    cover?.width && cover?.height
      ? cover.height / cover.width
      : measured?.url === cover?.url
        ? measured?.ratio
        : 1;
  const height = Math.min(250, Math.max(150, width * (ratio ?? 1)));
  return (
    <View style={styles.card} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`查看帖子：${post.title}`}
        onPress={() => router.push({ pathname: '/posts/[post-id]', params: { 'post-id': id } })}
      >
        <PostImageView
          image={cover}
          height={height}
          label={post.title}
          onSize={(w, h) => {
            if (w > 0 && cover) setMeasured({ url: cover.url, ratio: h / w });
          }}
        />
        <CommunityText bold numberOfLines={2} style={styles.title}>
          {post.title}
        </CommunityText>
        {!!post.excerpt && (
          <CommunityText numberOfLines={2} style={styles.excerpt}>
            {post.excerpt}
          </CommunityText>
        )}
      </Pressable>
      <CollectionButton postId={id} returnTo="/post" />
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.08)',
  },
  title: { fontSize: 16, lineHeight: 23, marginTop: 6, marginBottom: 4 },
  excerpt: { fontSize: 13, lineHeight: 19, color: colors.secondaryText },
});
