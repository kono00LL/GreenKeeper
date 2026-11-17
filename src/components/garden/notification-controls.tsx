import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { CommunityText } from '@/components/community/community-text';
import { sendTestNotification, type NotificationStatus } from '@/services/reminder-notifications';
import { refreshReminderNotifications } from '@/services/reminder-notification-sync';
import { useNotificationState } from '@/store/notification-state';

const messages = {
  enabled: '本机通知已启用；省电或勿扰模式可能影响弹窗和到达时间。',
  denied: '系统通知未开启，养护计划仍已保存，可在应用内查看。请到系统设置允许通知和弹窗。',
  unsupported: '系统通知仅支持 Android；当前平台可在应用内查看提醒。',
  failed: '系统通知同步失败，养护计划仍已保存。请重试，或检查系统通知设置。',
  idle: '允许通知后，将在本机提醒下一次养护；完成养护后安排下一次通知。',
};

export function showSavedNotificationStatus(status: NotificationStatus) {
  if (status === 'denied') Alert.alert('提醒已保存，系统通知未开启', messages.denied, [
    { text: '稍后', style: 'cancel' }, { text: '打开设置', onPress: () => { void Linking.openSettings().catch(() => undefined); } },
  ]);
  if (status === 'failed') Alert.alert('提醒已保存', messages.failed);
}

export function NotificationControls() {
  const status = useNotificationState((state) => state.status);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const test = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setFeedback(null);
    try {
      const result = await sendTestNotification();
      useNotificationState.setState({ status: result });
      setFeedback(result === 'enabled' ? '已发送测试通知，请查看系统通知栏。' : messages[result]);
      if (result === 'enabled') await refreshReminderNotifications();
    } finally { pending.current = false; setBusy(false); }
  };
  return <View style={styles.panel}>
    <CommunityText style={styles.hint}>{feedback ?? messages[status]}</CommunityText>
    <Pressable accessibilityRole="button" accessibilityLabel="发送测试通知" accessibilityState={{ disabled: busy, busy }} disabled={busy} style={styles.button} onPress={() => void test()}>
      <CommunityText bold style={styles.label}>{busy ? '正在发送…' : '发送测试通知'}</CommunityText>
    </Pressable>
    {status === 'denied' && <Pressable accessibilityRole="button" onPress={() => { void Linking.openSettings().catch(() => setFeedback('无法打开系统设置，请在手机设置中允许 GreenKeeper 通知。')); }} style={styles.button}><CommunityText bold style={styles.label}>打开通知设置</CommunityText></Pressable>}
    {status === 'failed' && <Pressable accessibilityRole="button" onPress={() => { setFeedback(null); void refreshReminderNotifications(); }} style={styles.button}><CommunityText bold style={styles.label}>重试通知同步</CommunityText></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { gap: 12, padding: 16, backgroundColor: '#edf4ef', borderRadius: 12 },
  hint: { color: '#46685b', fontSize: 13, lineHeight: 21 },
  button: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  label: { color: '#08745d', fontSize: 16 },
});
