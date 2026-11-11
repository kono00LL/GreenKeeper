export type CareType = 'watering' | 'fertilizing';
export type RepeatUnit = 'days' | 'weeks';
export type LastCareChoice = 'today' | 'yesterday' | 'one_week_ago' | 'two_weeks_ago' | 'over_two_weeks' | 'unknown';
export type ReminderInput = {
  instanceId: string;
  careType: CareType;
  interval: number;
  unit: RepeatUnit;
  time: string;
  timeZone: string;
  lastCareChoice: LastCareChoice;
  lastCareDate?: string | null;
};
export type Reminder = ReminderInput & {
  id: string;
  plantId: string;
  displayName: string;
  lastCareDate: string | null;
  anchorDate: string;
  nextDueDate: string;
  createdAt: string;
  updatedAt: string;
};
export const careLabels: Record<CareType, string> = { watering: '浇水', fertilizing: '施肥' };
export const lastCareLabels: Record<LastCareChoice, string> = {
  today: '今天', yesterday: '昨天', one_week_ago: '1周前', two_weeks_ago: '两周前', over_two_weeks: '超过两周', unknown: '不记得了',
};
