import type { ReactNode } from 'react';
import { View } from 'react-native';

// The page owns the reserved height; future search/topics can fill this slot.
export function CommunityHeader({ height, children }: { height: number; children?: ReactNode }) {
  return (
    <View style={{ height, flexShrink: 0 }} testID="community-header">
      {children}
    </View>
  );
}
