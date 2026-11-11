import { useLocalSearchParams } from 'expo-router';
import { ReminderFormScreen } from '@/components/garden/reminder-form-screen';
export default function NewReminderPage() {
  const { instanceId } = useLocalSearchParams<{ instanceId?: string }>();
  return <ReminderFormScreen key={instanceId ?? 'new'} instanceId={instanceId} />;
}
