import { create } from 'zustand';
import type { NotificationStatus } from '@/services/reminder-notifications';

export const useNotificationState = create<{ status: NotificationStatus | 'idle' }>(() => ({ status: 'idle' }));
