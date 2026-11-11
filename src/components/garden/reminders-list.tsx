import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CommunityText } from '@/components/community/community-text';
import { PlantLoadState } from '@/components/plants/plant-load-state';
import { usePlantResource } from '@/hooks/use-plant-resource';
import { reminderApi } from '@/services/reminder-api';
import { statusOf } from '@/services/post-errors';
import { dueStatus, todayInZone } from '@/services/reminder-dates';
import { careLabels, type Reminder } from '@/types/reminder';

export function RemindersList() {
  const { data, loading, error, reload } = usePlantResource('reminders', reminderApi.mine);
  const pending = useRef(new Set<string>());
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const login = () => router.push({ pathname: '/auth', params: { returnTo: '/garden/reminders' } });
  const edit = (item: Reminder) => router.push({ pathname: '/garden/reminders/[reminderId]', params: { reminderId: item.id } });
  const mutate = async (item: Reminder, action: 'complete' | 'remove') => {
    if (pending.current.has(item.id)) return;
    pending.current.add(item.id);
    setBusyIds([...pending.current]);
    setActionError(null);
    try { await reminderApi[action](item.id); await reload(); }
    catch (requestError) {
      if (statusOf(requestError) === 401) login();
      else setActionError('操作失败，请检查网络后重试');
    } finally { pending.current.delete(item.id); setBusyIds([...pending.current]); }
  };
  if (loading && !data) return <PlantLoadState loading message="正在加载提醒…" />;
  if (error && !data) {
    if (error.status === 401) return <View><CommunityText>登录后管理养护提醒</CommunityText><Action label="登录" onPress={login} /></View>;
    return <PlantLoadState message="提醒暂时无法加载" retry={() => void reload()} />;
  }
  return <View style={styles.list}>
    <Action label="添加提醒" onPress={() => router.push('/garden/reminders/new')} />
    <CommunityText style={styles.hint}>到期后请在提醒事项查看，完成养护后点击「已完成」。</CommunityText>
    {error && <PlantLoadState message="刷新失败，请重试" retry={() => void reload()} />}
    {actionError && <CommunityText accessibilityRole="alert" style={styles.error}>{actionError}</CommunityText>}
    {data?.length === 0 && <CommunityText style={styles.empty}>还没有养护提醒</CommunityText>}
    {data?.map((item) => {
      const status = dueStatus(item.nextDueDate, todayInZone(item.timeZone));
      const label = `${item.displayName} ${careLabels[item.careType]}`;
      const busy = busyIds.includes(item.id);
      return <View key={item.id} style={styles.card}>
        <CommunityText bold style={styles.name}>{item.displayName}</CommunityText>
        <CommunityText style={styles.detail}>{careLabels[item.careType]} · 每 {item.interval} {item.unit === 'days' ? '天' : '周'} · {item.time}</CommunityText>
        <CommunityText style={styles.detail}>下次提醒：{item.nextDueDate}</CommunityText>
        <CommunityText style={[styles.status, status !== '未到期' && styles.due]}>{status}</CommunityText>
        <View style={styles.actions}>
          <Action label="已完成" accessibilityLabel={`已完成：${label}`} disabled={busy} onPress={() => void mutate(item, 'complete')} />
          <Action label="编辑" accessibilityLabel={`编辑提醒：${label}`} disabled={busy} onPress={() => edit(item)} />
          <Action label="删除" accessibilityLabel={`删除提醒：${label}`} disabled={busy} onPress={() => void mutate(item, 'remove')} />
        </View>
      </View>;
    })}
  </View>;
}
function Action({ label, accessibilityLabel = label, disabled = false, onPress }: { label: string; accessibilityLabel?: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><CommunityText bold style={styles.buttonText}>{label}</CommunityText></Pressable>;
}
const styles = StyleSheet.create({
  list: { gap: 14 }, hint: { color: '#60776e', fontSize: 13, lineHeight: 21 },
  card: { backgroundColor: '#fff', borderColor: '#e1e4e2', borderRadius: 14, borderWidth: 1, gap: 10, padding: 18 },
  name: { color: '#064c38', fontSize: 20 }, detail: { color: '#46685b', fontSize: 15 }, status: { color: '#60776e', fontSize: 14 }, due: { color: '#a85520' },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }, button: { alignItems: 'center', backgroundColor: '#e6f1ec', borderRadius: 8, justifyContent: 'center', minHeight: 44, paddingHorizontal: 18 }, buttonText: { color: '#08745d', fontSize: 16 }, disabled: { opacity: 0.5 },
  empty: { color: '#60776e', paddingVertical: 40, textAlign: 'center' }, error: { color: '#b43f30' },
});
