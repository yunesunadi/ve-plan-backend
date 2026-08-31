import { DateTime, IANAZone } from "luxon";

function resolveDefaultTz(): string {
  const configured = process.env.DEFAULT_EVENT_TZ;
  if (configured) {
    if (IANAZone.isValidZone(configured)) return configured;
    console.warn(`DEFAULT_EVENT_TZ="${configured}" is not a valid IANA zone; falling back to the system zone.`);
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export const DEFAULT_EVENT_TZ: string = resolveDefaultTz();

export function isValidTimezone(tz: unknown): tz is string {
  return typeof tz === "string" && tz.length > 0 && IANAZone.isValidZone(tz);
}

export function resolveTimezone(tz: unknown): string {
  return isValidTimezone(tz) ? tz : DEFAULT_EVENT_TZ;
}

type EventTimeParts = {
  date: Date | string;
  start_time: Date | string;
  end_time: Date | string;
  timezone: string;
};

export function deriveInstants(parts: EventTimeParts): { starts_at: Date; ends_at: Date } {
  const zone = parts.timezone;
  const day = DateTime.fromJSDate(new Date(parts.date), { zone });
  const start = DateTime.fromJSDate(new Date(parts.start_time), { zone });
  const end = DateTime.fromJSDate(new Date(parts.end_time), { zone });

  const compose = (time: DateTime) =>
    DateTime.fromObject(
      {
        year: day.year,
        month: day.month,
        day: day.day,
        hour: time.hour,
        minute: time.minute,
        second: time.second,
        millisecond: time.millisecond,
      },
      { zone }
    ).toJSDate();

  return { starts_at: compose(start), ends_at: compose(end) };
}
