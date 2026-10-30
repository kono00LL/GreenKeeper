import { useLocalSearchParams } from 'expo-router';
import { PlantCategoryScreen } from '@/components/plants/plant-category-screen';

export default function PlantCategoryPage() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <PlantCategoryScreen slug={typeof slug === 'string' ? slug : ''} />;
}
