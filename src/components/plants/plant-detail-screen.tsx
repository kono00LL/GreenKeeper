import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';
import { plantApi } from '@/services/plant-api';
import type { PlantDetail } from '@/types/plant';
import { usePlantResource } from '@/hooks/use-plant-resource';
import { PlantLoadState } from './plant-load-state';
import { PlantAdvice } from './plant-advice';
import { statusOf } from '@/services/post-errors';

const careLabels = [
  ['sunlightRequirement', '阳光'],
  ['wateringRequirement', '水分'],
  ['repottingRequirement', '换盆'],
  ['pests', '害虫'],
] as const;

async function openImageSource(url: string) {
  try { await Linking.openURL(url); }
  catch { Alert.alert('暂时无法打开链接', '请稍后重试'); }
}

function temperatureDescription(plant: PlantDetail | null) {
  if (!plant) return null;
  const { temperatureMinC: min, temperatureMaxC: max, temperatureNotes: notes } = plant;
  let range: string | null = null;
  if (min !== null && max !== null) range = min + '–' + max + ' °C';
  else if (min !== null) range = '下限 ' + min + ' °C（上限待补充）';
  else if (max !== null) range = '上限 ' + max + ' °C（下限待补充）';
  return [range, notes].filter(Boolean).join('；') || null;
}

export function PlantDetailScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fetchPlant = useCallback(() => plantApi.detail(id), [id]);
  const { data: plant, loading, error, reload } = usePlantResource(id, fetchPlant);
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const expanded = expandedFor === id;
  const temperature = temperatureDescription(plant);
  const careItems = [
    ['temperature', '温度', temperature] as const,
    ...careLabels.map(([key, label]) => [key, label, plant?.[key] ?? null] as const),
  ];

  const addToGarden = async () => {
    if (!plant || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    try {
      await plantApi.addMine(plant.id);
      Alert.alert('添加成功', '已添加到我的植物');
    } catch (addError) {
      if (statusOf(addError) === 401) {
        router.push({ pathname: '/auth', params: { returnTo: `/plants/${plant.id}` } });
      } else {
        Alert.alert('添加失败', '请检查网络后重试。');
      }
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <Pressable
        accessibilityRole="button" accessibilityLabel="返回上一页"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else if (plant?.categories[0]) router.replace({ pathname: '/plants/category/[slug]', params: { slug: plant.categories[0].slug } });
          else router.replace('/');
        }}
        style={[styles.backButton, { top: insets.top + 12 }]}>
        <CommunityText style={styles.backIcon}>‹</CommunityText>
      </Pressable>
      {loading && !plant ? (
        <PlantLoadState loading message="正在加载植物资料…" />
      ) : error?.status === 404 ? (
        <PlantLoadState message="没有找到这项植物资料" />
      ) : error && !plant ? (
        <PlantLoadState message="植物资料暂时无法加载" retry={() => void reload()} />
      ) : !plant ? (
        <PlantLoadState message="没有找到这项植物资料" />
      ) : (
        <>
          <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <PlantHero key={`${plant.id}:${plant.coverImage?.url ?? 'empty'}`} image={plant.coverImage} label={plant.nameZh} height={Math.round(height * 0.6)} />

            <View style={styles.content}>
              {error && <PlantLoadState message="刷新失败，当前显示上次加载的资料" retry={() => void reload()} />}
              <View style={styles.identityLine}>
                <CommunityText bold style={styles.name}>{plant.nameZh}</CommunityText>
                {plant.identityStatus === 'pending' && <CommunityText style={styles.status}>身份待核对</CommunityText>}
              </View>
              <CommunityText style={styles.classification}>{plant.categories.map((category) => category.nameZh).join(' · ') || '分类待补充'}</CommunityText>
              {plant.nameEn && <CommunityText style={styles.englishName}>{plant.nameEn}</CommunityText>}
              <CommunityText style={styles.scientificName}>{plant.scientificName}</CommunityText>
              {plant.aliases.length > 0 && <CommunityText style={styles.aliases}>别名：{plant.aliases.map((alias) => alias.name).join('、')}</CommunityText>}

              <View style={styles.section}>
                <CommunityText bold style={styles.sectionTitle}>关于</CommunityText>
                {plant.summary ? (
                  <CommunityText numberOfLines={expanded ? undefined : 5} style={styles.body}>{plant.summary}</CommunityText>
                ) : (
                  <CommunityText style={styles.emptyText}>植物简介待补充</CommunityText>
                )}
                {plant.summary && (
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpandedFor(expanded ? null : id)} style={styles.readMore}>
                    <CommunityText style={styles.readMoreText}>{expanded ? '收起' : '阅读更多'}</CommunityText>
                  </Pressable>
                )}
                {plant.appearanceFeatures && (
                  <View style={styles.featureBlock}>
                    <CommunityText bold style={styles.featureTitle}>外观特征</CommunityText>
                    <CommunityText style={styles.features}>{plant.appearanceFeatures}</CommunityText>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <CommunityText bold style={styles.sectionTitle}>养护细节</CommunityText>
                {careItems.every(([, , value]) => !value) && (
                  <CommunityText style={styles.emptyText}>养护资料待补充</CommunityText>
                )}
                  <View style={styles.careList}>
                    {careItems.map(([key, label, value]) => (
                      <View key={key} style={styles.careRow}>
                        <CommunityText style={styles.careLabel}>{label}</CommunityText>
                        <CommunityText style={[styles.careValue, !value && styles.emptyText]}>{value || '待补充'}</CommunityText>
                      </View>
                    ))}
                  </View>
              </View>

              <PlantAdvice plant={plant} />
              {plant.coverImage && (
                <View style={styles.sourceSection}>
                  <CommunityText bold style={styles.sectionTitle}>图片来源</CommunityText>
                  {plant.coverImage.sourceName && <CommunityText style={styles.sourceText}>{plant.coverImage.sourceName}</CommunityText>}
                  {plant.coverImage.license && (plant.coverImage.licenseUrl ? (
                    <Pressable accessibilityRole="link" accessibilityLabel="查看图片许可证" onPress={() => void openImageSource(plant.coverImage!.licenseUrl!)} style={styles.sourceLink}>
                      <CommunityText style={styles.sourceUrl}>许可证：{plant.coverImage.license}</CommunityText>
                    </Pressable>
                  ) : <CommunityText style={styles.sourceText}>许可证：{plant.coverImage.license}</CommunityText>)}
                  {plant.coverImage.attribution && <CommunityText style={styles.sourceText}>署名：{plant.coverImage.attribution}</CommunityText>}
                  {plant.coverImage.sourceUrl && (
                    <Pressable accessibilityRole="link" accessibilityLabel="查看图片来源" onPress={() => void openImageSource(plant.coverImage!.sourceUrl!)} style={styles.sourceLink}>
                      <CommunityText style={styles.sourceUrl}>查看来源页面 ↗</CommunityText>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="添加到我的植物" accessibilityState={{ disabled: adding }} disabled={adding} onPress={() => void addToGarden()} style={[styles.addButton, adding && styles.addButtonDisabled]}>
              {adding ? <ActivityIndicator color={colors.white} /> : <CommunityText style={styles.addButtonText}>添加到我的植物</CommunityText>}
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function PlantHero({ image, label, height }: { image: PlantDetail['coverImage']; label: string; height: number }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return <View style={[styles.hero, { height }]}><CommunityText style={styles.heroPlaceholder}>图片资料暂未添加</CommunityText></View>;
  }
  return <Image accessibilityLabel={image.altText || label} contentFit="cover" onError={() => setFailed(true)} source={{ uri: image.url }} style={[styles.hero, { height }]} />;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white, flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { alignSelf: 'center', maxWidth: 760, paddingBottom: 24, width: '100%' },
  hero: { alignItems: 'center', backgroundColor: '#e8ece8', justifyContent: 'center' },
  heroPlaceholder: { color: '#69726b', fontSize: 14 },
  sourceSection: { borderTopColor: colors.divider, borderTopWidth: 1, marginTop: 20, paddingTop: 16 },
  sourceText: { color: colors.secondaryText, fontSize: 13, lineHeight: 21 },
  sourceUrl: { color: colors.selectedText, fontSize: 13, lineHeight: 21, marginTop: 4 },
  sourceLink: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  backButton: { backgroundColor: '#ffffffdd', borderRadius: 22, height: 44, justifyContent: 'center', left: 14, position: 'absolute', width: 44, zIndex: 1 },
  backIcon: { color: colors.text, fontSize: 34, lineHeight: 38, textAlign: 'center' },
  content: { paddingHorizontal: 20 },
  identityLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  name: { color: colors.text, fontSize: 25, lineHeight: 32 },
  status: { backgroundColor: '#fff2dc', borderRadius: 4, color: '#8a5d13', fontSize: 12, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4 },
  classification: { color: colors.secondaryText, fontSize: 14, marginTop: 6 },
  englishName: { color: colors.secondaryText, fontSize: 14, marginTop: 5 },
  scientificName: { color: colors.muted, fontSize: 14, fontStyle: 'italic', marginTop: 5 },
  aliases: { color: colors.secondaryText, fontSize: 13, marginTop: 8 },
  section: { borderTopColor: colors.divider, borderTopWidth: 1, marginTop: 20, paddingTop: 16 },
  sectionTitle: { color: colors.text, fontSize: 18, marginBottom: 10 },
  body: { color: colors.secondaryText, fontSize: 15, lineHeight: 24 },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  readMore: { alignSelf: 'flex-start', justifyContent: 'center', marginTop: 8, minHeight: 40 },
  readMoreText: { color: colors.selectedText, fontSize: 14, fontWeight: '600' },
  featureBlock: { marginTop: 16 },
  featureTitle: { fontSize: 14, marginBottom: 6 },
  features: { color: colors.secondaryText, fontSize: 14, lineHeight: 22 },
  careList: { borderTopColor: colors.divider, borderTopWidth: 1 },
  careRow: { borderBottomColor: colors.divider, borderBottomWidth: 1, flexDirection: 'row', gap: 20, paddingVertical: 14 },
  careLabel: { color: colors.secondaryText, fontSize: 14, width: 64 },
  careValue: { color: colors.text, flex: 1, fontSize: 14, lineHeight: 21 },
  bottomBar: { alignSelf: 'center', borderTopColor: colors.divider, borderTopWidth: 1, maxWidth: 760, paddingHorizontal: 18, paddingTop: 10, width: '100%' },
  addButton: { alignItems: 'center', backgroundColor: colors.selectedText, borderRadius: 6, justifyContent: 'center', minHeight: 48 },
  addButtonDisabled: { opacity: 0.65 },
  addButtonText: { color: colors.white, fontSize: 15 },
});
