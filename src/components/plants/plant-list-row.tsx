import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';
import type { PlantSummary } from '@/types/plant';

export function PlantListRow({ plant }: { plant: PlantSummary }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`查看植物：${plant.nameZh}`}
      onPress={() => router.push({ pathname: '/plants/[id]', params: { id: plant.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <PlantThumbnail key={plant.coverImage?.url ?? 'empty'} image={plant.coverImage} label={plant.nameZh} />
      <View style={styles.plantCopy}>
        <View style={styles.nameLine}>
          <CommunityText bold numberOfLines={1} style={styles.plantName}>{plant.nameZh}</CommunityText>
          {plant.identityStatus === 'pending' && <CommunityText style={styles.status}>身份待核对</CommunityText>}
        </View>
        <CommunityText numberOfLines={1} style={styles.scientificName}>{plant.scientificName}</CommunityText>
      </View>
      <CommunityText style={styles.chevron}>›</CommunityText>
    </Pressable>
  );
}

function PlantThumbnail({ image, label }: { image: PlantSummary['coverImage']; label: string }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return <View accessibilityLabel="暂无图片" style={styles.plantImagePlaceholder}><CommunityText style={styles.imageLabel}>暂无图片</CommunityText></View>;
  }
  return <Image accessibilityLabel={image.altText || label} contentFit="cover" onError={() => setFailed(true)} source={{ uri: image.url }} style={styles.plantImagePlaceholder} />;
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', borderBottomColor: colors.divider, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 92, paddingVertical: 10 },
  pressed: { opacity: 0.7 },
  plantImagePlaceholder: { alignItems: 'center', backgroundColor: '#eef0ed', borderRadius: 6, height: 68, justifyContent: 'center', overflow: 'hidden', width: 76 },
  imageLabel: { color: '#737a74', fontSize: 10 },
  plantCopy: { flex: 1, gap: 5 },
  nameLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  plantName: { color: colors.text, fontSize: 16, maxWidth: '68%' },
  status: { backgroundColor: '#fff2dc', borderRadius: 4, color: '#8a5d13', fontSize: 11, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3 },
  scientificName: { color: colors.secondaryText, fontSize: 13, fontStyle: 'italic' },
  chevron: { color: colors.muted, fontSize: 25, paddingHorizontal: 4 },
});
