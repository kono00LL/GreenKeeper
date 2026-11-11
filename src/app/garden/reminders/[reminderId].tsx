import { useLocalSearchParams } from 'expo-router';
import { ReminderFormScreen } from '@/components/garden/reminder-form-screen';
export default function EditReminderPage() {
  const { reminderId } = useLocalSearchParams<{ reminderId: string }>();
  return <ReminderFormScreen key={reminderId} reminderId={reminderId} />;
}
