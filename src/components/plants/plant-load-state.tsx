import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/color';
import { CommunityText } from '@/components/community/community-text';

export function PlantLoadState({
  message,
  loading = false,
  retry,
}: {
  message: string;
  loading?: boolean;
  retry?: () => void;
}) {
  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator color={colors.selectedText} />}
      <CommunityText style={styles.message}>{message}</CommunityText>
      {retry && (
        <Pressable accessibilityRole="button" accessibilityLabel="重试" onPress={retry} style={styles.retry}>
          <CommunityText style={styles.retryText}>重试</CommunityText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12, justifyContent: 'center', minHeight: 180, padding: 24 },
  message: { color: colors.secondaryText, fontSize: 15, textAlign: 'center' },
  retry: { alignItems: 'center', backgroundColor: colors.selectedBackground, borderRadius: 6, justifyContent: 'center', minHeight: 40, minWidth: 88 },
  retryText: { color: colors.selectedText, fontSize: 14, fontWeight: '600' },
});
