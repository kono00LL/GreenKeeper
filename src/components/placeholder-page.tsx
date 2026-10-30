import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

type PlaceholderPageProps = {
  route: string;
  title: string;
};

export function PlaceholderPage({ route, title }: PlaceholderPageProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.route}>{route}</Text>
        <Text style={styles.hint}>页面占位，后续逐步完善</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f8f8f8',
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 88,
    paddingHorizontal: 24,
  },
  title: {
    color: '#222222',
    fontSize: 28,
    fontWeight: '600',
  },
  route: {
    color: '#68dbbb',
    fontSize: 14,
    marginTop: 8,
  },
  hint: {
    color: '#99999b',
    fontSize: 14,
    marginTop: 16,
  },
});
