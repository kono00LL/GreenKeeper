import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PostImage } from '@/types/post';
import { colors } from '@/constants/color';
import { CommunityText } from './community-text';
import { PostImageView } from './post-image';

type PagerProps = {
  images: PostImage[];
  index: number;
  onIndex: (index: number) => void;
  height: number;
  onOpen?: (index: number) => void;
  onSize?: (id: string, width: number, height: number) => void;
};
function ImagePager({ images, index, onIndex, height, onOpen, onSize }: PagerProps) {
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (width) scroll.current?.scrollTo({ x: index * width, animated: false });
  }, [index, width]);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ height }}
        onMomentumScrollEnd={(e) => {
          if (width)
            onIndex(
              Math.max(
                0,
                Math.min(images.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)),
              ),
            );
        }}
      >
        {images.map((image, i) => (
          <View key={image.id} style={{ width }}>
            {onOpen ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`查看第 ${i + 1} 张大图`}
                onPress={() => onOpen(i)}
              >
                <PostImageView
                  image={image}
                  height={height}
                  fit="contain"
                  label={`第 ${i + 1} 张图片`}
                  onSize={(w, h) => onSize?.(image.id, w, h)}
                />
              </Pressable>
            ) : (
              <PostImageView
                image={image}
                height={height}
                fit="contain"
                label={`第 ${i + 1} 张大图`}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
export function PostGallery({ images }: { images: PostImage[] }) {
  const { width, height: screenHeight } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const current = Math.min(index, Math.max(0, images.length - 1));
  const height = Math.min(
    width * 1.5,
    Math.max(
      220,
      ...images.map(
        (image) =>
          (image.width && image.height ? image.height / image.width : (ratios[image.id] ?? 0.8)) *
          (width - 16),
      ),
    ),
  );
  if (!images.length) return <PostImageView height={250} label="帖子图片" />;
  const controls = (
    <View style={styles.controls}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="上一张"
        disabled={current === 0}
        onPress={() => setIndex(current - 1)}
        style={styles.control}
      >
        <CommunityText style={current === 0 && styles.disabled}>‹</CommunityText>
      </Pressable>
      <CommunityText style={styles.counter}>
        {current + 1} / {images.length}
      </CommunityText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="下一张"
        disabled={current === images.length - 1}
        onPress={() => setIndex(current + 1)}
        style={styles.control}
      >
        <CommunityText style={current === images.length - 1 && styles.disabled}>›</CommunityText>
      </Pressable>
    </View>
  );
  return (
    <View style={styles.gallery}>
      <ImagePager
        images={images}
        index={current}
        onIndex={setIndex}
        height={height}
        onOpen={(i) => {
          setIndex(i);
          setVisible(true);
        }}
        onSize={(id, w, h) => {
          if (w > 0)
            setRatios((previous) =>
              previous[id] === h / w ? previous : { ...previous, [id]: h / w },
            );
        }}
      />
      {!visible && controls}
      <Modal visible={visible} onRequestClose={() => setVisible(false)} animationType="fade">
        <SafeAreaView style={styles.fullscreen}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭大图"
            onPress={() => setVisible(false)}
            style={styles.close}
          >
            <CommunityText>关闭 ×</CommunityText>
          </Pressable>
          <View style={styles.preview}>
            <ImagePager
              images={images}
              index={current}
              onIndex={setIndex}
              height={Math.max(160, screenHeight - 180)}
            />
          </View>
          {controls}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  gallery: { padding: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  control: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  counter: { fontSize: 13, color: colors.secondaryText },
  disabled: { color: colors.muted },
  fullscreen: { flex: 1, backgroundColor: colors.background },
  preview: { flex: 1, justifyContent: 'center' },
  close: { minHeight: 44, paddingHorizontal: 20, alignItems: 'flex-end', justifyContent: 'center' },
});
