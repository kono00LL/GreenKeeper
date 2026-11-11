import { useLocalSearchParams } from 'expo-router';
import { PlaceholderPage } from '@/components/placeholder-page';

export default function GardenFeaturePage() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const title = feature === 'recommended' ? '最佳适合植物' : '添加植物';
  return <PlaceholderPage title={title} route={`/garden/${feature ?? 'feature'}`} />;
}

