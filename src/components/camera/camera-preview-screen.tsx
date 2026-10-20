import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityText } from '@/components/community/community-text';
import { colors } from '@/constants/color';

export function CameraPreviewScreen() {
  const { uri } = useLocalSearchParams<{ uri?: string | string[] }>();
  const imageUri = Array.isArray(uri) ? uri[0] : uri;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回拍摄" onPress={() => router.back()} style={styles.headerAction}>
          <CommunityText style={styles.actionText}>‹ 返回</CommunityText>
        </Pressable>
        <CommunityText bold style={styles.title}>图片预览</CommunityText>
        <View style={styles.headerAction} />
      </View>
      <View style={styles.content}>
        {imageUri ? (
          <Image accessibilityLabel="已选择的图片" contentFit="contain" source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <CommunityText style={styles.empty}>没有可预览的图片</CommunityText>
        )}
        <CommunityText style={styles.caption}>本地图片预览</CommunityText>
      </View>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" accessibilityLabel="重新选择" onPress={() => router.replace('/(tabs)/camera')} style={styles.reselect}>
          <CommunityText bold style={styles.reselectText}>重新选择</CommunityText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderColor: colors.divider },
  headerAction: { width: 76, minHeight: 44, justifyContent: 'center' },
  actionText: { color: colors.selectedText, fontSize: 16 },
  title: { color: colors.text, fontSize: 17 },
  content: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '88%' },
  empty: { color: colors.muted },
  caption: { color: colors.secondaryText, fontSize: 14, marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.divider },
  reselect: { height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 4, backgroundColor: colors.primary },
  reselectText: { color: colors.text, fontSize: 16 },
});
