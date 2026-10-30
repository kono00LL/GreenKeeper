import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/color';
import { CommunityText } from './community-text';

// The page owns the reserved height; future search/topics can fill this slot.
const features = [
  { key: 'daily', label: '每日问答', color: colors.primary },
  { key: 'plants', label: '绿植托管', color: colors.green },
  { key: 'ranking', label: '上门服务', color: colors.cyan },
] as const;

export function CommunityHeader({ height, children }: { height: number; children?: ReactNode }) {
  return (
    <View style={[styles.header, { height }]} testID="community-header">
      {children ?? features.map((feature) => (
        <Pressable
          key={feature.key}
          accessibilityRole="button"
          accessibilityLabel={feature.label}
          onPress={() => router.push({ pathname: '/community/[feature]', params: { feature: feature.key } })}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
          <View style={[styles.iconWrap, { backgroundColor: feature.color }]}>
            <Image source={require('@/assets/icons/setting01.svg')} contentFit="contain" style={styles.icon} />
          </View>
          <CommunityText bold style={styles.label}>{feature.label}</CommunityText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8, paddingHorizontal: 8 },
  item: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 64, borderRadius: 12, paddingVertical: 8 },
  pressed: { opacity: 0.65, backgroundColor: colors.selectedBackground },
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 19 },
  icon: { width: 23, height: 23, tintColor: colors.white },
  label: { marginTop: 5, fontSize: 13, color: colors.secondaryText },
});
