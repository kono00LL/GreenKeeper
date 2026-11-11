import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { PlantLoadState } from '@/components/plants/plant-load-state';
import { usePlantResource } from '@/hooks/use-plant-resource';
import { plantApi } from '@/services/plant-api';
import { reminderApi } from '@/services/reminder-api';
import { addCalendarDays, previewSchedule, todayInZone } from '@/services/reminder-dates';
import { statusOf } from '@/services/post-errors';
import { careLabels, lastCareLabels, type CareType, type LastCareChoice, type RepeatUnit, type ReminderInput } from '@/types/reminder';

type Picker = 'plant' | 'care' | 'repeat' | 'last' | null;
export function ReminderFormScreen({ instanceId, reminderId }: { instanceId?: string; reminderId?: string }) {
  const fetchData = useCallback(async () => {
    const [plants, reminders] = await Promise.all([plantApi.mine(), reminderApi.mine()]);
    return { plants, reminders };
  }, []);
  const { data, loading, error, reload } = usePlantResource(`reminder-form:${reminderId ?? instanceId ?? 'new'}`, fetchData);
  const [selectedInstance, setSelectedInstance] = useState(instanceId ?? '');
  const [careType, setCareType] = useState<CareType>('watering');
  const [interval, setIntervalValue] = useState(1);
  const [unit, setUnit] = useState<RepeatUnit>('days');
  const [time, setTime] = useState('09:00');
  const [timeZone, setTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [lastChoice, setLastChoice] = useState<LastCareChoice | null>(null);
  const [lastChanged, setLastChanged] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const initialized = useRef(false);
  const existing = data?.reminders.find((item) => item.id === reminderId);
  const plant = data?.plants.find((item) => item.instanceId === selectedInstance);
  const duplicate = data?.reminders.find((item) => item.instanceId === selectedInstance && item.careType === careType && item.id !== reminderId);
  const returnTo = reminderId ? `/garden/reminders/${encodeURIComponent(reminderId)}` : `/garden/reminders/new${instanceId ? `?instanceId=${encodeURIComponent(instanceId)}` : ''}`;
  const login = useCallback(() => router.replace({ pathname: '/auth', params: { returnTo } }), [returnTo]);
  const editExisting = (id: string) => router.replace({ pathname: '/garden/reminders/[reminderId]', params: { reminderId: id } });

  useEffect(() => { if (error?.status === 401) login(); }, [error?.status, login]);
  // Hydrate the edit form once the remote reminder has loaded.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!data || initialized.current) return;
    initialized.current = true;
    if (existing) {
      setSelectedInstance(existing.instanceId); setCareType(existing.careType);
      setIntervalValue(existing.interval); setUnit(existing.unit); setTime(existing.time);
      setTimeZone(existing.timeZone); setLastChoice(existing.lastCareChoice);
    }
  }, [data, existing]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const today = todayInZone(timeZone);
  const schedule = lastChoice ? previewSchedule(today, lastChoice, interval, unit) : null;
  const nextDate = existing && !lastChanged ? addCalendarDays(existing.anchorDate, interval * (unit === 'weeks' ? 7 : 1)) : schedule?.nextDueDate;
  const close = () => { if (router.canGoBack()) router.back(); else router.replace('/garden/reminders'); };
  const save = async () => {
    if (submittingRef.current || !plant || !lastChoice) return;
    if (duplicate) { editExisting(duplicate.id); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage('请输入有效的 24 小时时间，例如 09:00'); return; }
    submittingRef.current = true; setSubmitting(true); setMessage(null);
    const base = { instanceId: selectedInstance, careType, interval, unit, time, timeZone };
    try {
      if (reminderId) {
        await reminderApi.update(reminderId, { ...base, ...(lastChanged ? { lastCareChoice: lastChoice, lastCareDate: schedule?.lastCareDate ?? null } : {}) });
      } else {
        await reminderApi.create({ ...base, lastCareChoice: lastChoice, lastCareDate: schedule?.lastCareDate ?? null } satisfies ReminderInput);
      }
      router.replace('/garden/reminders');
    } catch (requestError) {
      if (statusOf(requestError) === 401) login();
      else if (statusOf(requestError) === 409) {
        const id = (requestError as { response?: { data?: { error?: { reminderId?: string } } } }).response?.data?.error?.reminderId;
        if (id) editExisting(id); else setMessage('已有同类提醒，请返回列表编辑');
      } else if (statusOf(requestError) === 404) setMessage('植物实例或提醒已被删除，请返回花园刷新');
      else setMessage('保存失败，请检查网络后重试');
    } finally { submittingRef.current = false; setSubmitting(false); }
  };
  const chooseInstance = (id: string) => { setSelectedInstance(id); setPicker(null); };

  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.screen}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="关闭提醒设置" disabled={submitting} onPress={close} style={styles.close}><CommunityText style={styles.closeText}>×</CommunityText></Pressable>
        <CommunityText bold style={styles.title}>{reminderId ? '编辑提醒' : '设置提醒'}</CommunityText><View style={styles.balance} />
      </View>
      {loading && !data ? <PlantLoadState loading message="正在加载提醒设置…" /> : error && !data ? <PlantLoadState message="提醒设置暂时无法加载" retry={() => void reload()} /> : reminderId && !existing ? <PlantLoadState message="提醒不存在或已删除" /> : data?.plants.length === 0 ? <View style={styles.empty}><CommunityText style={styles.hint}>请先在花园中添加植物</CommunityText><Button label="返回花园" onPress={() => router.replace('/(tabs)/garden')} /></View> : <>
        <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Row label="植物" value={plant ? (plant.customName || plant.nameZh) : '选择植物'} onPress={() => setPicker('plant')} />
          {selectedInstance && !plant && <CommunityText style={styles.error}>该植物实例不存在，请重新选择</CommunityText>}
          <Row label="提醒我关于" value={careLabels[careType]} onPress={() => setPicker('care')} />
          <Row label="重复" value={`每 ${interval} ${unit === 'days' ? '天' : '周'}`} onPress={() => setPicker('repeat')} />
          <View style={styles.row}><CommunityText bold style={styles.rowLabel}>时间</CommunityText><TextInput accessibilityLabel="提醒时间（24小时制）" value={time} onChangeText={setTime} placeholder="09:00" maxLength={5} style={styles.timeInput} /></View>
          <Row label="上一次" accessibilityLabel="上一次养护" value={lastChoice ? (existing && !lastChanged ? (existing.lastCareDate ?? lastCareLabels[lastChoice]) : lastCareLabels[lastChoice]) : '选择'} onPress={() => setPicker('last')} />
          {duplicate && <Button label="编辑已有同类提醒" onPress={() => editExisting(duplicate.id)} />}
          <CommunityText style={styles.hint}>提醒保存在应用内，请在「提醒事项」查看到期计划。</CommunityText>
          <CommunityText style={styles.hint}>时间按 {timeZone} 显示。</CommunityText>
          {message && <CommunityText accessibilityRole="alert" style={styles.error}>{message}</CommunityText>}
        </ScrollView>
        <View style={styles.footer}>
          <CommunityText style={styles.nextDate}>{nextDate ? `下次提醒：${nextDate}` : '请选择上一次养护时间'}</CommunityText>
          <Button label={reminderId ? '保存提醒' : '开启提醒'} disabled={!plant || !lastChoice || submitting} loading={submitting} onPress={() => void save()} />
        </View>
      </>}
      <Modal transparent animationType="fade" visible={picker !== null} onRequestClose={() => setPicker(null)}>
        <View style={styles.backdrop}><View style={styles.sheet}>
          <CommunityText bold style={styles.sheetTitle}>{picker === 'plant' ? '选择植物' : picker === 'care' ? '提醒我关于' : picker === 'repeat' ? '重复周期' : '上一次养护'}</CommunityText>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.options}>
            {picker === 'plant' && data?.plants.map((item, index) => <Choice key={item.instanceId} label={`${item.customName || item.nameZh} · 第 ${index + 1} 株`} selected={item.instanceId === selectedInstance} onPress={() => chooseInstance(item.instanceId)} />)}
            {picker === 'care' && (Object.keys(careLabels) as CareType[]).map((key) => <Choice key={key} label={careLabels[key]} selected={key === careType} onPress={() => { setCareType(key); setPicker(null); }} />)}
            {picker === 'last' && (Object.keys(lastCareLabels) as LastCareChoice[]).map((key) => <Choice key={key} label={lastCareLabels[key]} selected={key === lastChoice} onPress={() => { setLastChoice(key); setLastChanged(true); setPicker(null); }} />)}
          </ScrollView>
          {picker === 'repeat' && <View style={styles.repeatColumns}>
            <ScrollView style={styles.numbers} contentOffset={{ x: 0, y: Math.max(0, interval - 2) * 46 }}>
              {Array.from({ length: unit === 'days' ? 365 : 52 }, (_, index) => index + 1).map((value) => <Choice key={value} label={String(value)} selected={value === interval} onPress={() => setIntervalValue(value)} />)}
            </ScrollView>
            <View style={styles.units}>{(['days', 'weeks'] as RepeatUnit[]).map((value) => <Choice key={value} label={value === 'days' ? '天' : '周'} selected={unit === value} onPress={() => { setUnit(value); setIntervalValue((current) => Math.min(current, value === 'days' ? 365 : 52)); }} />)}</View>
          </View>}
          <Button label={picker === 'repeat' ? '确定周期' : '取消'} onPress={() => setPicker(null)} />
        </View></View>
      </Modal>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function Row({ label, value, accessibilityLabel = label, onPress }: { label: string; value: string; accessibilityLabel?: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.row}><CommunityText bold style={styles.rowLabel}>{label}</CommunityText><CommunityText style={styles.rowValue}>{value}</CommunityText></Pressable>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.selectedChoice]}><CommunityText style={styles.choiceText}>{label}{selected ? ' ✓' : ''}</CommunityText></Pressable>;
}
function Button({ label, disabled = false, loading = false, onPress }: { label: string; disabled?: boolean; loading?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>{loading ? <ActivityIndicator color="#fff" /> : <CommunityText bold style={styles.buttonText}>{label}</CommunityText>}</Pressable>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f8f8' }, flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomColor: '#e3e5e3', borderBottomWidth: 1, paddingHorizontal: 18, minHeight: 64 },
  close: { minWidth: 44, minHeight: 44, justifyContent: 'center' }, closeText: { color: '#07533d', fontSize: 34 }, balance: { width: 44 }, title: { color: '#064c38', fontSize: 23, textAlign: 'center', flex: 1 },
  content: { alignSelf: 'center', width: '100%', maxWidth: 640, padding: 20, gap: 14, paddingBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e6e5', minHeight: 84, paddingHorizontal: 22, paddingVertical: 18 },
  rowLabel: { color: '#064c38', fontSize: 18 }, rowValue: { color: '#08816b', fontSize: 18, flexShrink: 1, textAlign: 'right' },
  timeInput: { backgroundColor: '#f8faf8', color: '#08816b', borderRadius: 12, minHeight: 46, width: 92, fontSize: 20, paddingHorizontal: 12, textAlign: 'center' },
  hint: { color: '#72837a', fontSize: 13, lineHeight: 22 }, error: { color: '#b23c2a', fontSize: 14, lineHeight: 22 },
  footer: { alignSelf: 'center', width: '100%', maxWidth: 640, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 10, gap: 12 },
  nextDate: { color: '#07533d', textAlign: 'center', fontSize: 16 }, button: { backgroundColor: '#00866c', borderRadius: 28, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, buttonText: { color: '#fff', fontSize: 18 }, disabled: { backgroundColor: '#d8dcda' },
  empty: { padding: 28, gap: 24 }, backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000066' }, sheet: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 500, alignSelf: 'center', maxHeight: '80%', gap: 14 }, sheetTitle: { color: '#064c38', fontSize: 20, textAlign: 'center' }, options: { flexGrow: 0 },
  choice: { minHeight: 46, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: 8 }, selectedChoice: { backgroundColor: '#e6f3eb' }, choiceText: { color: '#07533d', fontSize: 17 }, repeatColumns: { flexDirection: 'row', height: 190, gap: 20 }, numbers: { flex: 1 }, units: { flex: 1, justifyContent: 'center' },
});
