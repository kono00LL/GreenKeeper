import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { PostImage } from '@/types/post';
import { colors } from '@/constants/color';
import { CommunityText } from './community-text';

type Props = {
  image?: PostImage;
  height: number;
  label: string;
  fit?: 'cover' | 'contain';
  onSize?: (width: number, height: number) => void;
};
export function PostImageView(props: Props) {
  return <ImageContent key={props.image?.url ?? 'empty'} {...props} />;
}
function ImageContent({ image, height, label, fit = 'cover', onSize }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  return (
    <View style={[styles.frame, { height }]}>
      {!image ? (
        <CommunityText style={styles.hint}>暂无图片</CommunityText>
      ) : status === 'error' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="重试图片"
          style={styles.retry}
          onPress={(event) => {
            event.stopPropagation();
            setStatus('loading');
            setAttempt((n) => n + 1);
          }}
        >
          <CommunityText style={styles.hint}>图片加载失败</CommunityText>
          <CommunityText style={styles.action}>点击重试</CommunityText>
        </Pressable>
      ) : (
        <>
          <Image
            key={attempt}
            source={{ uri: image.url }}
            accessibilityLabel={label}
            style={StyleSheet.absoluteFill}
            contentFit={fit}
            cachePolicy={attempt ? 'none' : 'memory-disk'}
            onLoad={(event) => {
              setStatus('ready');
              onSize?.(event.source.width, event.source.height);
            }}
            onError={(event) => {
              console.error('[PostImage] 图片加载失败', {
                url: image.url,
                error: event.error,
              });
              setStatus('error');
            }}
          />
          {status === 'loading' && (
            <ActivityIndicator pointerEvents="none" color={colors.selectedText} />
          )}
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.divider,
    overflow: 'hidden',
  },
  hint: { color: colors.secondaryText, fontSize: 13 },
  action: { color: colors.selectedText, fontSize: 13 },
  retry: { minHeight: 44, padding: 12, alignItems: 'center', gap: 8 },
});
