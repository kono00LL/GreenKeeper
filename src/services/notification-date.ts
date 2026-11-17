/** Interpret a calendar date/time in the plan's zone, never the device's zone.
 * A fold uses its first occurrence; a gap uses the next valid wall-clock minute.
 */
export function notificationDate(date: string, time: string, timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const target = `${date}T${time}`;
  const utc = Date.parse(`${target}:00Z`);
  if (!Number.isFinite(utc)) throw new Error('Invalid reminder date');
  let next: { wall: string; instant: number } | undefined;
  // Covers all current IANA UTC offsets, including the surrounding DST change.
  for (let instant = utc - 18 * 3600000; instant <= utc + 18 * 3600000; instant += 60000) {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, value]));
    const wall = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
    if (wall === target) return new Date(instant);
    if (wall > target && (!next || wall < next.wall)) next = { wall, instant };
  }
  if (!next) throw new Error('Cannot resolve reminder time zone');
  return new Date(next.instant);
}
