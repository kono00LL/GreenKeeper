import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';
import { plantApi } from '@/services/plant-api';
import { usePlantResource } from '@/hooks/use-plant-resource';
import { PlantLoadState } from './plant-load-state';

export function PlantCategoryScreen({ slug }: { slug: string }) {
  const insets = useSafeAreaInsets();
  const fetchCategory = useCallback(async () => {
    const [categories, items] = await Promise.all([plantApi.categories(), plantApi.list(slug)]);
    return { categories, items };
  }, [slug]);
  const { data, loading, error, reload } = usePlantResource(slug, fetchCategory);
  const items = data?.items ?? [];
  const category = data?.categories.find((item) => item.slug === slug);
  const title = category?.nameZh ?? items[0]?.categories.find((item) => item.slug === slug)?.nameZh ?? '植物分类';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回分类总览" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
          <CommunityText style={styles.backIcon}>‹</CommunityText>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <CommunityText bold numberOfLines={1} style={styles.headerTitle}>{title}</CommunityText>
          <CommunityText style={styles.headerSubtitle}>{category?.nameEn ?? ''}</CommunityText>
        </View>
        <View style={styles.headerBalance} />
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.list, { paddingBottom: 16 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={() => void reload()} tintColor={colors.selectedText} colors={[colors.selectedText]} />}>
        {loading && items.length === 0 ? (
          <PlantLoadState loading message="正在加载植物…" />
        ) : error?.status === 400 ? (
          <PlantLoadState message="没有找到这个植物分类" />
        ) : error && items.length === 0 ? (
          <PlantLoadState message="植物列表暂时无法加载" retry={() => void reload()} />
        ) : items.length === 0 ? (
          <PlantLoadState message="这个分类暂时没有植物资料" />
        ) : (
          <View style={styles.rows}>
            {error && <PlantLoadState message="刷新失败，当前显示上次加载的植物" retry={() => void reload()} />}
            {items.map((plant) => (
              <Pressable
                key={plant.id}
                accessibilityRole="button"
                accessibilityLabel={`查看植物：${plant.nameZh}`}
                onPress={() => router.push({ pathname: '/plants/[id]', params: { id: plant.id } })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.plantImagePlaceholder}><CommunityText style={styles.imageLabel}>暂无图片</CommunityText></View>
                <View style={styles.plantCopy}>
                  <View style={styles.nameLine}>
                    <CommunityText bold numberOfLines={1} style={styles.plantName}>{plant.nameZh}</CommunityText>
                    {plant.identityStatus === 'pending' && <CommunityText style={styles.status}>身份待核对</CommunityText>}
                  </View>
                  <CommunityText numberOfLines={1} style={styles.scientificName}>{plant.scientificName}</CommunityText>
                </View>
                <CommunityText style={styles.chevron}>›</CommunityText>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: colors.divider, borderBottomWidth: 1, flexDirection: 'row', minHeight: 58, paddingHorizontal: 12 },
  backButton: { alignItems: 'flex-start', justifyContent: 'center', minHeight: 48, minWidth: 56 },
  backIcon: { color: colors.text, fontSize: 34, lineHeight: 38 },
  headerTitleWrap: { alignItems: 'center', flex: 1 },
  headerTitle: { color: colors.text, fontSize: 17 },
  headerSubtitle: { color: colors.muted, fontSize: 11, marginTop: 1 },
  headerBalance: { minWidth: 56 },
  list: { alignSelf: 'center', flexGrow: 1, maxWidth: 760, paddingHorizontal: 16, paddingVertical: 8, width: '100%' },
  rows: { backgroundColor: colors.white },
  row: { alignItems: 'center', borderBottomColor: colors.divider, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 92, paddingVertical: 10 },
  pressed: { opacity: 0.7 },
  plantImagePlaceholder: { alignItems: 'center', backgroundColor: '#eef0ed', borderRadius: 6, height: 68, justifyContent: 'center', width: 76 },
  imageLabel: { color: '#737a74', fontSize: 10 },
  plantCopy: { flex: 1, gap: 5 },
  nameLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  plantName: { color: colors.text, fontSize: 16, maxWidth: '68%' },
  status: { backgroundColor: '#fff2dc', borderRadius: 4, color: '#8a5d13', fontSize: 11, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3 },
  scientificName: { color: colors.secondaryText, fontSize: 13, fontStyle: 'italic' },
  chevron: { color: colors.muted, fontSize: 25, paddingHorizontal: 4 },
});
