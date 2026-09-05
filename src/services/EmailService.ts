import * as nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";
import { escapeHtml } from "../helpers/utils";
import { logger } from "../helpers/logger";

require("dotenv").config();

const EmailLog = require("../models/EmailLog");

const KNOWN_ACTIONS = [
  "email_verified",
  "reset_password",
  "register_approved",
  "invitation_sent",
  "meeting_started",
  "meeting_ended",
] as const;

const RETRYABLE_CODES = ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "EAUTH", "EENVELOPE", "ECONNRESET"];
const MAX_ATTEMPTS = 3;

// retrySweep timings / caps
const STUCK_MS = 10 * 60 * 1000; // pending rows older than this are treated as restart orphans
const RETRY_COOLDOWN_MS = 5 * 60 * 1000; // min gap before re-attempting a retryable failure
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // stop auto-retrying a failure once it is older than this
const SWEEP_ATTEMPT_CEIL = 6; // cumulative-attempt ceiling for auto-retry
const SWEEP_BATCH = 50; // max rows requeued per sweep run
const REQUEUE_BATCH = 200; // max rows re-delivered per organizer-triggered event retry

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      auth: {
        type: "OAuth2",
        user: process.env.SMTP_USER,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        accessToken: process.env.OAUTH_ACCESS_TOKEN,
      },
    });
  }
  return transporter;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const templatePath = (name: string) =>
  path.join(__dirname, "..", "email_templates", `${name}.html`);

function renderTemplate(templateName: string, variables: Record<string, unknown>): string {
  let template: string;
  try {
    template = fs.readFileSync(templatePath(templateName), "utf8");
  } catch (err) {
    throw new Error(`Email template "${templateName}" could not be read.`);
  }

  for (const [key, value] of Object.entries(variables)) {
    const replacement = key === "link" ? String(value ?? "") : escapeHtml(value);
    template = template.replace(new RegExp(`{{${key}}}`, "g"), replacement);
  }
  return template;
}

export function assertTemplates() {
  const missing = KNOWN_ACTIONS.filter((a) => !fs.existsSync(templatePath(a)));
  if (missing.length === 0) return;

  const msg = `Missing email templates: ${missing.join(", ")}`;
  if (process.env.NODE_ENV === "production") {
    logger.error(msg);
    process.exit(1);
  }
  logger.warn(msg + " (run `npm run build` to copy them into dist/)");
}

function isRetryable(err: any): boolean {
  if (RETRYABLE_CODES.includes(err?.code)) return true;
  const status = err?.responseCode;
  return typeof status === "number" && status >= 400 && status < 500;
}

const saveLog = (log: any) => log.save().catch((e: any) => logger.error({ err: e }, "EmailLog save failed"));

const subjectFor = (action: string): string | undefined => ({
  email_verified: "Email Verification",
  reset_password: "Password Reset",
  register_approved: "Registration Approved",
  invitation_sent: "Event Invitation",
  meeting_started: "Meeting Started",
  meeting_ended: "Meeting Ended",
}[action]);

const NOTIFICATION_ACTIONS = new Set([
  "register_approved",
  "invitation_sent",
  "meeting_started",
  "meeting_ended",
]);

function unsubscribeHeaders(action: string): Record<string, string> | undefined {
  if (!NOTIFICATION_ACTIONS.has(action)) return undefined;
  const address = process.env.UNSUBSCRIBE_EMAIL || process.env.SENDER;
  if (!address) return undefined;
  return {
    "List-Unsubscribe": `<mailto:${address}?subject=Unsubscribe%20from%20VE-Plan%20event%20emails>`,
  };
}

export function renderMail(action: string, meta: any): { subject: string | undefined; html: string } {
  const subject = subjectFor(action);
  const html = renderTemplate(action, {
    name: meta?.name,
    event_title: meta?.event_title,
    link: meta?.link,
  });
  return { subject, html };
}

async function deliver(log: any) {
  try {
    let mailOptions: nodemailer.SendMailOptions;
    try {
      const { subject, html } = renderMail(log.action, log.meta);
      const headers = unsubscribeHeaders(log.action);
      mailOptions = {
        to: log.to,
        from: log.from,
        subject: log.subject ?? subject,
        html,
        ...(headers ? { headers } : {}),
      };
    } catch (renderError: any) {
      log.status = "failed";
      log.retryable = false;
      log.lastError = String(renderError?.message ?? renderError);
      await saveLog(log);
      logger.error({ err: renderError, to: log.to, action: log.action }, "email could not be rendered");
      return;
    }

    const priorAttempts = log.attempts ?? 0;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await getTransporter().sendMail(mailOptions);
        log.status = "sent";
        log.attempts = priorAttempts + attempt;
        log.retryable = false;
        log.sentAt = new Date();
        await saveLog(log);
        return;
      } catch (error: any) {
        log.attempts = priorAttempts + attempt;
        log.lastError = String(error?.message ?? error);
        if (!isRetryable(error) || attempt === MAX_ATTEMPTS) {
          log.status = "failed";
          log.retryable = isRetryable(error);
          await saveLog(log);
          logger.error({ err: error, to: log.to, action: log.action, attempts: log.attempts }, "email delivery failed");
          return;
        }
        // exponential backoff with jitter
        await sleep(500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250));
      }
    }
  } catch (fatal: any) {
    logger.error({ err: fatal }, "email deliver crashed");
  }
}

const metaFor = (additional: any) => ({
  name: additional?.name,
  event_title: additional?.event_title,
  link: additional?.link,
});

export const send = async (obj: { action: string; recipient: string; additional: any }) => {
  const meta = metaFor(obj.additional);
  const { subject } = renderMail(obj.action, meta);

  const log = await EmailLog.create({
    to: obj.recipient,
    action: obj.action,
    subject,
    from: process.env.SENDER,
    meta,
    status: "pending",
  });

  void deliver(log);
};

export const sendBatch = async (
  items: { action: string; recipient: string; additional: any }[],
  opts?: { event?: string }
) => {
  if (items.length === 0) return;

  const prepared = items.map((item) => {
    const meta = metaFor(item.additional);
    const subject = subjectFor(item.action);
    let renderError: string | null = null;
    try {
      renderMail(item.action, meta);
    } catch (err: any) {
      renderError = String(err?.message ?? err);
    }
    return { item, meta, subject, renderError };
  });

  const logs = await EmailLog.insertMany(
    prepared.map((p) => ({
      to: p.item.recipient,
      action: p.item.action,
      subject: p.subject,
      from: process.env.SENDER,
      meta: p.meta,
      ...(opts?.event ? { event: opts.event } : {}),
      status: p.renderError ? "failed" : "pending",
      attempts: 0,
      lastError: p.renderError ?? undefined,
    }))
  );

  prepared.forEach((p, i) => {
    if (p.renderError) return;
    void deliver(logs[i]);
  });
};

export async function retrySweep(): Promise<void> {
  const now = Date.now();

  const rows = await EmailLog.find({
    $or: [
      {
        status: "pending",
        updatedAt: { $lt: new Date(now - STUCK_MS) },
      },
      {
        status: "failed",
        retryable: true,
        attempts: { $lt: SWEEP_ATTEMPT_CEIL },
        updatedAt: { $lt: new Date(now - RETRY_COOLDOWN_MS) },
        createdAt: { $gt: new Date(now - MAX_AGE_MS) },
      },
    ],
  }).limit(SWEEP_BATCH);

  if (rows.length === 0) return;

  logger.info({ count: rows.length }, "email retry sweep: requeuing emails");

  for (const row of rows) {
    row.status = "pending";
    await row.save();
    void deliver(row);
  }
}

export async function statusForEvent(
  eventId: string
): Promise<{ sent: number; pending: number; failed: number; retryableFailed: number }> {
  const [sent, pending, failed, retryableFailed] = await Promise.all([
    EmailLog.countDocuments({ event: eventId, status: "sent" }),
    EmailLog.countDocuments({ event: eventId, status: "pending" }),
    EmailLog.countDocuments({ event: eventId, status: "failed" }),
    EmailLog.countDocuments({ event: eventId, status: "failed", retryable: true }),
  ]);

  return { sent, pending, failed, retryableFailed };
}

export async function requeueFailedForEvent(eventId: string): Promise<number> {
  const failed = await EmailLog.find(
    { event: eventId, status: "failed", retryable: true },
    { _id: 1 }
  ).limit(REQUEUE_BATCH);

  if (failed.length === 0) return 0;

  const ids = failed.map((row: any) => row._id);
  const result = await EmailLog.updateMany({ _id: { $in: ids } }, { $set: { status: "pending" } });

  const rows = await EmailLog.find({ _id: { $in: ids } });
  for (const row of rows) {
    void deliver(row);
  }

  return result.modifiedCount ?? ids.length;
}
