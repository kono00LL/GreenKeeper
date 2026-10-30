import { useLocalSearchParams } from 'expo-router';
import { PlantDetailScreen } from '@/components/plants/plant-detail-screen';

export default function PlantPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <PlantDetailScreen id={typeof id === 'string' ? id : ''} />;
}
