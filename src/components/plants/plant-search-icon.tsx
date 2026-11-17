import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/color';

export function PlantSearchIcon() {
  return (
    <View style={styles.icon} accessible={false}>
      <View style={styles.circle} />
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { height: 20, width: 20 },
  circle: { borderColor: colors.muted, borderRadius: 7, borderWidth: 1.7, height: 14, left: 1, position: 'absolute', top: 1, width: 14 },
  handle: { backgroundColor: colors.muted, borderRadius: 1, height: 2, left: 12, position: 'absolute', top: 15, transform: [{ rotate: '45deg' }], width: 7 },
});
