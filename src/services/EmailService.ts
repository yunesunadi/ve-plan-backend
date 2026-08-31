import * as nodemailer from "nodemailer";
import * as fs from "fs";
import * as path from "path";
import { escapeHtml } from "../helpers/utils";

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
    console.error(msg);
    process.exit(1);
  }
  console.warn(msg + " (run `npm run build` to copy them into dist/)");
}

function isRetryable(err: any): boolean {
  if (RETRYABLE_CODES.includes(err?.code)) return true;
  const status = err?.responseCode;
  return typeof status === "number" && status >= 400 && status < 500;
}

const saveLog = (log: any) => log.save().catch((e: any) => console.error("EmailLog save failed:", e?.message ?? e));

async function deliver(mailOptions: nodemailer.SendMailOptions, log: any) {
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await getTransporter().sendMail(mailOptions);
        log.status = "sent";
        log.attempts = attempt;
        log.sentAt = new Date();
        await saveLog(log);
        return;
      } catch (error: any) {
        log.attempts = attempt;
        log.lastError = String(error?.message ?? error);
        if (!isRetryable(error) || attempt === MAX_ATTEMPTS) {
          log.status = "failed";
          await saveLog(log);
          console.error(`Email to ${log.to} (${log.action}) failed after ${attempt} attempt(s):`, error?.message ?? error);
          return;
        }
        // exponential backoff with jitter
        await sleep(500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250));
      }
    }
  } catch (fatal: any) {
    console.error("Email deliver crashed:", fatal?.message ?? fatal);
  }
}

const subjectFor = (action: string): string | undefined => ({
  email_verified: "Email Verification",
  reset_password: "Password Reset",
  register_approved: "Registration Approved",
  invitation_sent: "Event Invitation",
  meeting_started: "Meeting Started",
  meeting_ended: "Meeting Ended",
}[action]);

export const send = async (obj: { action: string; recipient: string; additional: any }) => {
  const subject = subjectFor(obj.action);

  const html = renderTemplate(obj.action, {
    name: obj.additional?.name,
    event_title: obj.additional?.event_title,
    link: obj.additional?.link,
  });

  const log = await EmailLog.create({
    to: obj.recipient,
    action: obj.action,
    subject,
    status: "pending",
  });

  const mailOptions: nodemailer.SendMailOptions = {
    to: obj.recipient,
    from: process.env.SENDER,
    subject,
    html,
  };

  // Fire-and-forget; `deliver` owns its own error handling and updates the log.
  void deliver(mailOptions, log);
};

export const sendBatch = async (
  items: { action: string; recipient: string; additional: any }[]
) => {
  if (items.length === 0) return;

  const prepared = items.map((item) => {
    const subject = subjectFor(item.action);
    let html: string | null = null;
    let renderError: string | null = null;
    try {
      html = renderTemplate(item.action, {
        name: item.additional?.name,
        event_title: item.additional?.event_title,
        link: item.additional?.link,
      });
    } catch (err: any) {
      renderError = String(err?.message ?? err);
    }
    return { item, subject, html, renderError };
  });

  const logs = await EmailLog.insertMany(
    prepared.map((p) => ({
      to: p.item.recipient,
      action: p.item.action,
      subject: p.subject,
      status: p.renderError ? "failed" : "pending",
      attempts: 0,
      lastError: p.renderError ?? undefined,
    }))
  );

  prepared.forEach((p, i) => {
    if (p.renderError || !p.html) return;
    const mailOptions: nodemailer.SendMailOptions = {
      to: p.item.recipient,
      from: process.env.SENDER,
      subject: p.subject,
      html: p.html,
    };
    void deliver(mailOptions, logs[i]);
  });
};

export const countRecentFailures = async (action: string, since: Date): Promise<number> => {
  return EmailLog.countDocuments({ action, status: "failed", createdAt: { $gte: since } });
};
