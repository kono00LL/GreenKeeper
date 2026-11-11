import { apiClient } from './http';
import type { Reminder, ReminderInput } from '@/types/reminder';
export const reminderApi = {
  mine: async () => (await apiClient.get<{ items: Reminder[] }>('/me/reminders')).data.items,
  create: async (input: ReminderInput) => (await apiClient.post<{ reminder: Reminder }>('/me/reminders', input)).data.reminder,
  update: async (id: string, input: Partial<ReminderInput>) => (await apiClient.patch<{ reminder: Reminder }>(`/me/reminders/${encodeURIComponent(id)}`, input)).data.reminder,
  complete: async (id: string) => (await apiClient.post<{ reminder: Reminder }>(`/me/reminders/${encodeURIComponent(id)}/complete`)).data.reminder,
  remove: async (id: string) => (await apiClient.delete<{ removed: boolean }>(`/me/reminders/${encodeURIComponent(id)}`)).data,
};
