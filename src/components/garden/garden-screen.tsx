import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { PlantLoadState } from '@/components/plants/plant-load-state';
import { colors } from '@/constants/color';
import { usePlantResource } from '@/hooks/use-plant-resource';
import { plantApi } from '@/services/plant-api';
import type { MyPlant } from '@/types/plant';

import { RemindersList } from './reminders-list';

type GardenTab = 'plants' | 'reminders';

export function GardenScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<GardenTab>('plants');
  const [renamingPlant, setRenamingPlant] = useState<MyPlant | null>(null);
  const [customNameInput, setCustomNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [removingInstances, setRemovingInstances] = useState<string[]>([]);
  const savingNameRef = useRef(false);
  const removingInstancesRef = useRef(new Set<string>());
  const { data, loading, error, reload } = usePlantResource('my-plants', plantApi.mine);
  const plants = data ?? [];

  const removePlant = async (plant: MyPlant) => {
    if (removingInstancesRef.current.has(plant.instanceId)) return;
    removingInstancesRef.current.add(plant.instanceId);
    setRemovingInstances((current) => [...current, plant.instanceId]);
    try {
      await plantApi.removeMine(plant.instanceId);
      await reload();
    } catch {
      Alert.alert('移除失败', '请检查网络后重试。');
    } finally {
      removingInstancesRef.current.delete(plant.instanceId);
      setRemovingInstances((current) => current.filter((instanceId) => instanceId !== plant.instanceId));
    }
  };

  const openPlantOptions = (plant: MyPlant) => {
    const displayName = plant.customName || plant.nameZh;
    Alert.alert('植物选项', `选择要对「${displayName}」进行的操作`, [
      { text: '重命名', onPress: () => {
        setCustomNameInput(displayName);
        setRenamingPlant(plant);
      } },
      { text: '添加提醒', onPress: () => router.push({ pathname: '/garden/reminders/new', params: { instanceId: plant.instanceId } }) },
      { text: '删除实例', style: 'destructive', onPress: () => void removePlant(plant) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const savePlantName = async () => {
    if (!renamingPlant || savingNameRef.current) return;
    const normalizedName = customNameInput.trim();
    if (Array.from(normalizedName).length > 30) {
      Alert.alert('名称过长', '自定义名称最多 30 个字符。');
      return;
    }
    savingNameRef.current = true;
    setSavingName(true);
    try {
      await plantApi.renameMine(renamingPlant.instanceId, normalizedName);
      setRenamingPlant(null);
      await reload();
    } catch {
      Alert.alert('重命名失败', '请检查网络后重试。');
    } finally {
      savingNameRef.current = false;
      setSavingName(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: 88 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={loading && data !== null} onRefresh={() => void reload()} tintColor={colors.selectedText} colors={[colors.selectedText]} />}>
        <CommunityText bold style={styles.title}>我的花园</CommunityText>
        <View accessibilityRole="tablist" style={styles.tabs}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'plants' }} onPress={() => setActiveTab('plants')} style={[styles.tab, activeTab === 'plants' && styles.selectedTab]}>
            <CommunityText bold={activeTab === 'plants'} style={[styles.tabText, activeTab === 'plants' && styles.selectedTabText]}>我的植物</CommunityText>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: activeTab === 'reminders' }} onPress={() => setActiveTab('reminders')} style={[styles.tab, activeTab === 'reminders' && styles.selectedTab]}>
            <CommunityText bold={activeTab === 'reminders'} style={[styles.tabText, activeTab === 'reminders' && styles.selectedTabText]}>提醒事项</CommunityText>
          </Pressable>
        </View>

        {activeTab === 'reminders' ? (
          <RemindersList />
        ) : loading && plants.length === 0 ? (
          <PlantLoadState loading message="正在加载我的植物…" />
        ) : error && plants.length === 0 ? (
          error.status === 401 ? (
            <View style={styles.emptyState}>
              <CommunityText bold style={styles.emptyTitle}>登录后管理您的植物</CommunityText>
              <PrimaryAction label="登录" onPress={() => router.push({ pathname: '/auth', params: { returnTo: '/garden' } })} />
            </View>
          ) : <PlantLoadState message="我的植物暂时无法加载" retry={() => void reload()} />
        ) : plants.length === 0 ? (
          <View style={styles.emptyState}>
            <CommunityText bold style={styles.emptyTitle}>您的花园中没有植物 😔</CommunityText>
            <CommunityText style={styles.emptySubtitle}>点击添加您的第一株植物</CommunityText>
            <PrimaryAction label="添加植物" onPress={() => router.push({ pathname: '/garden/[feature]', params: { feature: 'add' } })} />
            <SecondaryAction label="✦  最佳适合植物" onPress={() => router.push({ pathname: '/garden/[feature]', params: { feature: 'recommended' } })} />
          </View>
        ) : (
          <View style={styles.plantsContent}>
            {error && <PlantLoadState message="刷新失败，当前显示上次加载的植物" retry={() => void reload()} />}
            <PrimaryAction label="＋  添加植物" onPress={() => router.push({ pathname: '/garden/[feature]', params: { feature: 'add' } })} />
            <View style={styles.plantsList}>
              {plants.map((plant) => (
                <View key={plant.instanceId} style={styles.plantCard}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`查看植物：${plant.customName || plant.nameZh}`} onPress={() => router.push({ pathname: '/plants/[id]', params: { id: plant.id } })} style={({ pressed }) => [styles.plantMain, pressed && styles.pressed]}>
                    <PlantImage plant={plant} />
                    <View style={styles.plantCopy}>
                      <CommunityText numberOfLines={1} style={styles.scientificName}>{plant.scientificName}</CommunityText>
                      <CommunityText bold numberOfLines={1} style={styles.plantName}>{plant.customName || plant.nameZh}</CommunityText>
                      <CommunityText style={styles.category}>{plant.categories[0]?.nameZh ?? '植物'}</CommunityText>
                    </View>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`植物选项：${plant.customName || plant.nameZh}`} accessibilityState={{ disabled: removingInstances.includes(plant.instanceId) }} disabled={removingInstances.includes(plant.instanceId)} onPress={() => openPlantOptions(plant)} style={styles.removeButton}>
                    <CommunityText style={styles.removeIcon}>{removingInstances.includes(plant.instanceId) ? '…' : '···'}</CommunityText>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
      <Modal animationType="fade" onRequestClose={() => !savingName && setRenamingPlant(null)} transparent visible={renamingPlant !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.renameDialog}>
            <CommunityText bold style={styles.renameTitle}>重命名植物</CommunityText>
            <TextInput accessibilityLabel="植物自定义名称" autoFocus onChangeText={setCustomNameInput} placeholder="输入名称，留空恢复原名" style={styles.renameInput} value={customNameInput} />
            <CommunityText style={styles.renameHint}>最多 30 个字符；留空将显示植物原名。</CommunityText>
            <View style={styles.renameActions}>
              <Pressable accessibilityRole="button" disabled={savingName} onPress={() => setRenamingPlant(null)} style={styles.renameCancel}><CommunityText style={styles.renameCancelText}>取消</CommunityText></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="保存名称" disabled={savingName} onPress={() => void savePlantName()} style={styles.renameSave}>
                {savingName ? <ActivityIndicator color={colors.white} /> : <CommunityText bold style={styles.renameSaveText}>保存</CommunityText>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PlantImage({ plant }: { plant: MyPlant }) {
  const [failed, setFailed] = useState(false);
  if (!plant.coverImage || failed) return <View style={styles.plantImage}><CommunityText style={styles.imageFallback}>暂无图片</CommunityText></View>;
  return <Image accessibilityLabel={plant.coverImage.altText || `${plant.nameZh}展示图`} contentFit="cover" onError={() => setFailed(true)} source={{ uri: plant.coverImage.url }} style={styles.plantImage} />;
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><CommunityText bold style={styles.primaryText}>{label}</CommunityText></Pressable>;
}

function SecondaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><CommunityText bold style={styles.secondaryText}>{label}</CommunityText></Pressable>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#f8f8f8', flex: 1 },
  content: { alignSelf: 'center', flexGrow: 1, maxWidth: 820, paddingHorizontal: 20, paddingTop: 22, width: '100%' },
  title: { color: '#064c38', fontSize: 27, marginBottom: 20 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  tab: { alignItems: 'center', borderColor: 'transparent', borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 56 },
  selectedTab: { backgroundColor: colors.white, borderColor: '#e1e4e2' },
  tabText: { color: '#83928d', fontSize: 16 },
  selectedTabText: { color: '#064c38' },
  emptyState: { flex: 1, justifyContent: 'center', minHeight: 430, paddingBottom: 30 },
  emptyTitle: { color: '#064c38', fontSize: 23, lineHeight: 32, textAlign: 'center' },
  emptySubtitle: { color: '#5a766d', fontSize: 17, lineHeight: 25, marginBottom: 24, marginTop: 12, textAlign: 'center' },
  primaryAction: { alignItems: 'center', backgroundColor: '#00866c', borderRadius: 8, justifyContent: 'center', minHeight: 72, paddingHorizontal: 16 },
  primaryText: { color: colors.white, fontSize: 22 },
  secondaryAction: { alignItems: 'center', backgroundColor: colors.white, borderColor: '#e1e4e2', borderRadius: 8, borderWidth: 1, justifyContent: 'center', marginTop: 14, minHeight: 68, paddingHorizontal: 16 },
  secondaryText: { color: '#064c38', fontSize: 19 },
  plantsContent: { gap: 16 },
  plantsList: { gap: 12 },
  plantCard: { alignItems: 'center', backgroundColor: colors.white, borderColor: '#e1e4e2', borderRadius: 8, borderWidth: 1, flexDirection: 'row', minHeight: 150, padding: 12 },
  plantMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 14, minWidth: 0 },
  plantImage: { alignItems: 'center', backgroundColor: '#e8eee9', borderRadius: 7, height: 118, justifyContent: 'center', overflow: 'hidden', width: 118 },
  imageFallback: { color: colors.muted, fontSize: 12 },
  plantCopy: { flex: 1, gap: 8, minWidth: 0 },
  scientificName: { color: '#668077', fontSize: 14 },
  plantName: { color: '#064c38', fontSize: 22 },
  category: { borderTopColor: colors.divider, borderTopWidth: 1, color: '#268e65', fontSize: 16, paddingTop: 8 },
  removeButton: { alignItems: 'center', alignSelf: 'flex-start', height: 44, justifyContent: 'center', width: 40 },
  removeIcon: { color: '#064c38', fontSize: 22, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  reminderPlaceholder: { flex: 1, justifyContent: 'center', minHeight: 420 },
  modalBackdrop: { alignItems: 'center', backgroundColor: '#00000066', flex: 1, justifyContent: 'center', padding: 24 },
  renameDialog: { backgroundColor: colors.white, borderRadius: 12, maxWidth: 460, padding: 22, width: '100%' },
  renameTitle: { color: '#064c38', fontSize: 20 },
  renameInput: { borderColor: '#cbd5d0', borderRadius: 7, borderWidth: 1, color: colors.text, fontSize: 16, marginTop: 18, minHeight: 48, paddingHorizontal: 12 },
  renameHint: { color: colors.muted, fontSize: 13, marginTop: 8 },
  renameActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 22 },
  renameCancel: { alignItems: 'center', borderRadius: 7, justifyContent: 'center', minHeight: 44, minWidth: 76, paddingHorizontal: 12 },
  renameCancelText: { color: colors.secondaryText, fontSize: 15 },
  renameSave: { alignItems: 'center', backgroundColor: colors.selectedText, borderRadius: 7, justifyContent: 'center', minHeight: 44, minWidth: 76, paddingHorizontal: 12 },
  renameSaveText: { color: colors.white, fontSize: 15 },
});
