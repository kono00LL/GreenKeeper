import { useLocalSearchParams } from 'expo-router';
import { PostDetailScreen } from '@/components/community/post-detail-screen';
export default function PostDetailPage() {
  const { 'post-id': id } = useLocalSearchParams<{ 'post-id': string }>();
  return <PostDetailScreen id={typeof id === 'string' ? id : ''} />;
}
