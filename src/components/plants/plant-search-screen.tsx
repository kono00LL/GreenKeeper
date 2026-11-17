import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommunityText, useCommunityFontFamily } from '@/components/community/community-text';
import { colors } from '@/constants/color';
import { usePlantResource } from '@/hooks/use-plant-resource';
import { plantApi } from '@/services/plant-api';
import { PlantListRow } from './plant-list-row';
import { PlantLoadState } from './plant-load-state';
import { PlantSearchIcon } from './plant-search-icon';

const RECOMMENDED_NAMES = [
  'Epipremnum aureum', 'Monstera deliciosa', 'Dracaena trifasciata',
  'Chlorophytum comosum', 'Ficus lyrata', 'Aloe vera',
];
const loadCatalogue = () => plantApi.list();

export function PlantSearchScreen() {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();
  const fontFamily = useCommunityFontFamily();
  const { data, loading, error, reload } = usePlantResource('plant-search', loadCatalogue);
  const plants = data ?? [];
  const keyword = query.trim().toLowerCase();
  const items = keyword
    ? plants.filter((plant) => [plant.nameZh, plant.nameEn, plant.scientificName].some((name) => name?.toLowerCase().includes(keyword)))
    : RECOMMENDED_NAMES.flatMap((name) => {
      const plant = plants.find((item) => item.scientificName === name);
      return plant ? [plant] : [];
    });

  const cancel = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.search}>
          <PlantSearchIcon />
          <TextInput
            accessibilityLabel="搜索植物"
            placeholder="搜索植物"
            placeholderTextColor={colors.muted}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={Keyboard.dismiss}
            style={[styles.input, { fontFamily }]}
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="清空搜索" onPress={() => setQuery('')} style={styles.clear}>
              <CommunityText style={styles.clearText}>×</CommunityText>
            </Pressable>
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="取消" onPress={cancel} style={styles.cancel}>
          <CommunityText style={styles.cancelText}>取消</CommunityText>
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(plant) => plant.id}
        renderItem={({ item }) => <PlantListRow plant={item} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: 80 + insets.bottom }]}
        ListHeaderComponent={
          <>
            <CommunityText bold style={styles.title}>{keyword ? '搜索结果' : '推荐植物'}</CommunityText>
            {error && data !== null && <PlantLoadState message="刷新失败，当前显示上次加载的植物" retry={() => void reload()} />}
          </>
        }
        ListEmptyComponent={loading && data === null
          ? <PlantLoadState loading message="正在加载植物…" />
          : error && data === null
            ? <PlantLoadState message="植物列表暂时无法加载" retry={() => void reload()} />
            : <PlantLoadState message={keyword ? '没有找到匹配的植物' : '暂无推荐植物'} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.white, flex: 1 },
  header: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 6, maxWidth: 760, paddingHorizontal: 16, paddingVertical: 12, width: '100%' },
  search: { alignItems: 'center', backgroundColor: '#f0f1f0', borderRadius: 10, flex: 1, flexDirection: 'row', gap: 10, minHeight: 46, paddingLeft: 14 },
  input: { color: colors.text, flex: 1, fontSize: 15, minHeight: 46, paddingRight: 8, paddingVertical: 10 },
  clear: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  clearText: { color: colors.muted, fontSize: 24 },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 46, minWidth: 48 },
  cancelText: { color: colors.blue, fontSize: 16 },
  list: { alignSelf: 'center', flexGrow: 1, maxWidth: 760, paddingHorizontal: 16, width: '100%' },
  title: { color: colors.text, fontSize: 19, paddingBottom: 8, paddingTop: 12 },
});
