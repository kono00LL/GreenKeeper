import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/color';
import type { Post } from '@/types/post';
import { CommunityText } from '@/components/community/community-text';
import { PostImageView } from '@/components/community/post-image';

export function CollectionCard({ post }: { post: Post }) {
  const [width, setWidth] = useState(170);
  const image = post.images[0] ?? (post.coverImage ? {
    id: `cover:${post.id}`,
    url: post.coverImage,
    width: null,
    height: null,
  } : undefined);
  const ratio = image?.width && image?.height ? image.height / image.width : 1;
  const imageHeight = Math.min(250, Math.max(150, (width - 8) * ratio));

  return (
    <View style={styles.card} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`查看收藏文章：${post.title}`}
        onPress={() => router.push({ pathname: '/posts/[post-id]', params: { 'post-id': post.id } })}>
        <PostImageView image={image} height={imageHeight} label={post.title} />
        <CommunityText bold numberOfLines={2} style={styles.title}>
          {post.title}
        </CommunityText>
        {!!post.excerpt && (
          <CommunityText numberOfLines={2} style={styles.excerpt}>
            {post.excerpt}
          </CommunityText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    marginBottom: 16,
    padding: 4,
  },
  title: { fontSize: 16, lineHeight: 23, marginTop: 6, marginBottom: 4 },
  excerpt: { color: colors.secondaryText, fontSize: 13, lineHeight: 19 },
});
