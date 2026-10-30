import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/color';
import { CommunityText } from '@/components/community/community-text';

const pages = {
  daily: { title: '每日问答', body: '这里用于测试每日问答功能。' },
  plants: { title: '绿植托管', body: '这里用于测试托管功能。' },
  ranking: { title: '上门服务', body: '这里用于测试上门服务功能。' },
} as const;

export default function CommunityFeaturePage() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const page = pages[feature as keyof typeof pages] ?? pages.daily;
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回社区" onPress={() => router.back()} style={styles.back}>
          <CommunityText style={styles.backText}>‹ 返回</CommunityText>
        </Pressable>
        <CommunityText bold style={styles.title}>{page.title}</CommunityText>
        <View style={styles.balance} />
      </View>
      <View style={styles.content}>
        <CommunityText bold style={styles.heading}>{page.title}</CommunityText>
        <CommunityText style={styles.body}>{page.body}</CommunityText>
        <CommunityText style={styles.hint}>全屏测试页面，后续可替换为正式功能。</CommunityText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: colors.primary },
  back: { minWidth: 76, minHeight: 44, justifyContent: 'center' },
  backText: { fontSize: 16 },
  balance: { width: 76 },
  title: { fontSize: 17 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 30 },
  body: { marginTop: 16, color: colors.secondaryText },
  hint: { marginTop: 10, color: colors.muted, fontSize: 13 },
});
