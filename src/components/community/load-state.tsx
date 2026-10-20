import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { CommunityText } from './community-text';
import { colors } from '@/constants/color';
export function LoadState({
  message,
  loading = false,
  retry,
  retryLabel = '重试',
}: {
  message: string;
  loading?: boolean;
  retry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator color={colors.selectedText} />}
      <CommunityText accessibilityRole={retry ? 'alert' : undefined} style={styles.message}>
        {message}
      </CommunityText>
      {retry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          onPress={retry}
          style={styles.button}
        >
          <CommunityText style={styles.action}>{retryLabel}</CommunityText>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20, gap: 10 },
  message: { color: colors.secondaryText, textAlign: 'center', fontSize: 14 },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.selectedBackground,
  },
  action: { color: colors.selectedText },
});
