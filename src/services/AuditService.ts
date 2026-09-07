import { logger } from "../helpers/logger";
const AuditLog = require("../models/AuditLog");

type AuditAction =
  | "role.set"
  | "register.approve"
  | "invite.send"
  | "meeting.create"
  | "meeting.end"
  | "event.delete"
  | "account.delete"
  | "password.change"
  | "password.reset";

interface AuditTarget {
  type: string;
  id?: string;
}

export async function record(
  req: any,
  action: AuditAction,
  target: AuditTarget,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await AuditLog.create({
      actor: {
        id: req?.user?._id,
        role: req?.user?.role,
        email: req?.user?.email,
      },
      action,
      target: { type: target.type, id: target.id ? String(target.id) : undefined },
      metadata,
      requestId: req?.id,
      ip: req?.ip,
    });
  } catch (err) {
    (req?.log ?? logger).error({ err, action }, "audit write failed");
  }
}
