import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';
import { plantApi } from '@/services/plant-api';
import { usePlantResource } from '@/hooks/use-plant-resource';
import { PlantLoadState } from './plant-load-state';

const INITIAL_CATEGORY_COUNT = 4;

export function PlantHomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = usePlantResource('categories', plantApi.categories);
  const categories = data ?? [];
  const [expanded, setExpanded] = useState(false);

  const visibleCategories = expanded ? categories : categories.slice(0, INITIAL_CATEGORY_COUNT);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: 80 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={() => void reload()} tintColor={colors.selectedText} colors={[colors.selectedText]} />}>
        <CommunityText bold style={styles.title}>分类总览</CommunityText>
        {loading && categories.length === 0 ? (
          <PlantLoadState loading message="正在加载植物分类…" />
        ) : error && categories.length === 0 ? (
          <PlantLoadState message="植物分类暂时无法加载" retry={() => void reload()} />
        ) : categories.length === 0 ? (
          <PlantLoadState message="暂无植物分类" />
        ) : (
          <>
            {error && <PlantLoadState message="刷新失败，当前显示上次加载的分类" retry={() => void reload()} />}
            <View style={styles.grid}>
              {Array.from({ length: Math.ceil(visibleCategories.length / 2) }, (_, index) => (
                <View key={index} style={styles.gridRow}>
                {visibleCategories.slice(index * 2, index * 2 + 2).map((category) => (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityLabel={`查看分类：${category.nameZh}`}
                    onPress={() => router.push({ pathname: '/plants/category/[slug]', params: { slug: category.slug } })}
                    style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                    <View style={styles.cardCopy}>
                      <CommunityText bold numberOfLines={2} style={styles.categoryName}>{category.nameZh}</CommunityText>
                      <CommunityText numberOfLines={2} style={styles.categoryEnglish}>{category.nameEn}</CommunityText>
                      <CommunityText style={styles.count}>{category.plantCount} 种植物</CommunityText>
                    </View>
                    <View accessibilityLabel="暂无图片" style={styles.preview}>
                      <CommunityText style={styles.previewLabel}>暂无图片</CommunityText>
                    </View>
                  </Pressable>
                ))}
                {visibleCategories.slice(index * 2, index * 2 + 2).length === 1 && <View style={styles.emptyCard} />}
                </View>
              ))}
            </View>
            {categories.length > INITIAL_CATEGORY_COUNT && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={expanded ? '收起分类' : '显示全部分类'}
                accessibilityState={{ expanded }}
                onPress={() => setExpanded((value) => !value)}
                style={styles.expandButton}>
                <CommunityText style={styles.expandText}>{expanded ? '收起' : '显示全部'}</CommunityText>
                <CommunityText style={styles.expandArrow}>{expanded ? '⌃' : '⌄'}</CommunityText>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.white, flex: 1 },
  content: { alignSelf: 'center', backgroundColor: colors.white, maxWidth: 880, paddingHorizontal: 16, paddingTop: 18, width: '100%' },
  title: { color: colors.text, fontSize: 23, marginBottom: 16 },
  grid: { gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  emptyCard: { flex: 1 },
  card: { backgroundColor: '#f0f1f0', borderRadius: 8, flex: 1, flexDirection: 'row', minHeight: 140, overflow: 'hidden' },
  pressed: { opacity: 0.78 },
  cardCopy: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 12, paddingVertical: 13 },
  categoryName: { color: colors.text, fontSize: 16, lineHeight: 22 },
  categoryEnglish: { color: colors.secondaryText, fontSize: 12, lineHeight: 17, marginTop: 3 },
  count: { color: colors.muted, fontSize: 12, marginTop: 'auto', paddingTop: 8 },
  preview: { alignItems: 'center', backgroundColor: '#e4e7e4', justifyContent: 'center', width: '32%' },
  previewLabel: { color: '#737a74', fontSize: 11, textAlign: 'center' },
  expandButton: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 18, minHeight: 44, paddingHorizontal: 12 },
  expandText: { color: colors.secondaryText, fontSize: 14 },
  expandArrow: { color: colors.secondaryText, fontSize: 18, lineHeight: 20 },
});
