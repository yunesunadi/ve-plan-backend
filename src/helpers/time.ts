export function minutesOfDay(value: Date | string): number {
  const d = new Date(value);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function endNotAfterStart(start: Date | string, end: Date | string): boolean {
  return minutesOfDay(end) <= minutesOfDay(start);
}
