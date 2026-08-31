import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";

export function isRequestInvalid(req: Request, res: Response) {
  const errors = validationResult(req);

  if(errors.array().length > 0) {
    res.status(400).json({
      status: "error",
      message: "Validation error",
      error: errors.array().map((err: any) => ({ value: err.path, msg: err.msg  }))
    });
    return true;
  }

  return false;
}

export function objectId(id: string) {
  const _id = new mongoose.Types.ObjectId(id);
  return _id;
}

export function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function maskEmail(email: string) {
  const at = email.lastIndexOf("@");

  if (at < 1) {
    return "***";
  }

  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.length <= 2
    ? local.slice(0, 1)
    : local.slice(0, 1) + "*".repeat(local.length - 2) + local.slice(-1);

  return `${visible}${domain}`;
}

export async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (err) {
    console.log(`best-effort task failed: ${label}`, err);
  }
}

export function eventInstant(event_date: Date | string, event_time: Date | string): number {
  const date = new Date(event_date);
  const time = new Date(event_time);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds()
  ).getTime();
}

export const JOIN_WINDOW_BEFORE_MIN = 15;
export const JOIN_WINDOW_AFTER_MIN = 30;

type EventTiming = {
  starts_at?: Date | string | null;
  ends_at?: Date | string | null;
  date?: Date | string;
  start_time?: Date | string;
  end_time?: Date | string;
};

function resolvedStart(event: EventTiming): number {
  if (event.starts_at) return new Date(event.starts_at).getTime();
  return eventInstant(event.date as Date, event.start_time as Date);
}

function resolvedEnd(event: EventTiming): number {
  if (event.ends_at) return new Date(event.ends_at).getTime();
  return eventInstant(event.date as Date, event.end_time as Date);
}

export function isEventExpired(event: EventTiming) {
  return resolvedEnd(event) < Date.now();
}

export function joinWindow(event: EventTiming) {
  return {
    opensAt: resolvedStart(event) - JOIN_WINDOW_BEFORE_MIN * 60000,
    closesAt: resolvedEnd(event) + JOIN_WINDOW_AFTER_MIN * 60000,
  };
}

export type JoinWindowState = "early" | "open" | "closed";

export function joinWindowState(event: EventTiming, now: number = Date.now()) {
  const { opensAt, closesAt } = joinWindow(event);

  let state: JoinWindowState = "open";
  if (now < opensAt) state = "early";
  else if (now > closesAt) state = "closed";

  return { state, opensAt, closesAt };
}