export function minutesOfDay(value: Date | string): number {
  const d = new Date(value);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function endNotAfterStart(start: Date | string, end: Date | string): boolean {
  return minutesOfDay(end) <= minutesOfDay(start);
}

export function outsideWindow(
  innerStart: Date | string,
  innerEnd: Date | string,
  outerStart: Date | string,
  outerEnd: Date | string
): boolean {
  const is = minutesOfDay(innerStart);
  const ie = minutesOfDay(innerEnd);
  return is < minutesOfDay(outerStart) || ie > minutesOfDay(outerEnd);
}
