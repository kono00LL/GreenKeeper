import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { RemindersList } from '@/components/garden/reminders-list';
export default function RemindersPage() {
  return <SafeAreaView style={styles.screen}><View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="返回花园" onPress={() => router.replace('/(tabs)/garden')} style={styles.back}><CommunityText style={styles.backText}>‹</CommunityText></Pressable>
    <CommunityText bold style={styles.title}>提醒事项</CommunityText>
  </View><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}><RemindersList /></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#f8f8f8' }, header: { alignItems: 'center', flexDirection: 'row', minHeight: 60, paddingHorizontal: 18 }, back: { minHeight: 44, minWidth: 44, justifyContent: 'center' }, backText: { color: '#064c38', fontSize: 34 }, title: { color: '#064c38', fontSize: 24 }, content: { padding: 20, paddingBottom: 36, width: '100%', maxWidth: 820, alignSelf: 'center' } });
