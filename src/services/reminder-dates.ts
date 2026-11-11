import type { LastCareChoice, RepeatUnit } from '@/types/reminder';
export function todayInZone(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function addCalendarDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export function previewSchedule(today: string, choice: LastCareChoice, interval: number, unit: RepeatUnit) {
  const offsets: Record<LastCareChoice, number | null> = { today: 0, yesterday: 1, one_week_ago: 7, two_weeks_ago: 14, over_two_weeks: null, unknown: null };
  const lastCareDate = offsets[choice] === null ? null : addCalendarDays(today, -offsets[choice]!);
  return { lastCareDate, nextDueDate: addCalendarDays(lastCareDate ?? today, interval * (unit === 'weeks' ? 7 : 1)) };
}
export function dueStatus(date: string, today: string) {
  const days = Math.round((Date.parse(today) - Date.parse(date)) / 86400000);
  if (days > 0) return `已逾期 ${days} 天`;
  return days === 0 ? '今天待处理' : '未到期';
}
