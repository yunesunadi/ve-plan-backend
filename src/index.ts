import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
const app = express();
const server = createServer(app);
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import path from "path";
import authRouter from "./routes/auth";
import userRouter from "./routes/user";
import eventRouter from "./routes/event";
import sessionRouter from "./routes/session";
import eventRegisterRouter from "./routes/event_register";
import eventInviteRouter from "./routes/event_invite";
import meetingRouter from "./routes/meeting";
import participantRouter from "./routes/participant";
import notificationRouter from "./routes/notification";
import clientLogRouter from "./routes/clientLog";

require("dotenv").config();

import { assertEnv, corsOrigin } from "./libs/env";
import * as EmailService from "./services/EmailService";
import { bestEffort } from "./helpers/utils";
import logger from "./helpers/logger";
import requestLogger from "./middlewares/requestLogger";
import metricsMiddleware from "./middlewares/metrics";
import { register as metricsRegister, socketConnections, emailQueueDepth, mongoUp } from "./helpers/metrics";
import { timingSafeEqual } from "crypto";
import * as ParticipantService from "./services/ParticipantService";
import { sweepOrphans } from "./helpers/reconcile";
assertEnv();
EmailService.assertTemplates();

import { disconnectDb } from "./libs/connectdb";
require("./libs/passport");

import * as socket from "./libs/socket";
socket.initializeSocket(server);

import { uploadErrorHandler } from "./helpers/uploads";

const corsOptions = {
  origin: corsOrigin(),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};
const PORT = process.env.PORT || 5000;
const PREFIX = "/api/v1";

app.use(helmet());
app.use(cors(corsOptions));
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.use(
  PREFIX + "/static",
  express.static(path.join(__dirname, "../dist/photos"), {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

function metricsTokenValid(header: string | undefined): boolean {
  const configured = process.env.METRICS_TOKEN;
  if (!configured) return false;
  const presented = (header ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(presented);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.get(PREFIX + "/metrics", async (req: Request, res: Response) => {
  if (!process.env.METRICS_TOKEN) {
    return res.status(503).type("text/plain").send("metrics endpoint not configured");
  }
  if (!metricsTokenValid(req.headers.authorization)) {
    return res.status(401).type("text/plain").send("unauthorized");
  }
  res.set("Content-Type", metricsRegister.contentType);
  return res.send(await metricsRegister.metrics());
});

app.get(PREFIX + "/health", (_req: Request, res: Response) => {
  const state = mongoose.connection.readyState; // 1 = connected
  return res.status(state === 1 ? 200 : 503).json({
    status: state === 1 ? "success" : "error",
    message: state === 1 ? "OK" : "Database not connected.",
    data: {
      uptime: Math.round(process.uptime()),
      db: state === 1 ? "connected" : "disconnected",
    },
  });
});

app.use(PREFIX + "/auth", authRouter);
app.use(PREFIX + "/user", userRouter);
app.use(PREFIX + "/events", eventRouter);
app.use(PREFIX + "/sessions", sessionRouter);
app.use(PREFIX + "/event_registers", eventRegisterRouter);
app.use(PREFIX + "/event_invites", eventInviteRouter);
app.use(PREFIX + "/meetings", meetingRouter);
app.use(PREFIX + "/participants", participantRouter);
app.use(PREFIX + "/notifications", notificationRouter);
app.use(PREFIX + "/client_errors", clientLogRouter);

app.use(uploadErrorHandler);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Page not found." });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  ((req as any).log ?? logger).error(
    { event: "unhandled_error", err, stack: err?.stack, requestId: (req as any).id },
    "unhandled error"
  );
  res.status(500).json({
    status: "error",
    message: "Something went wrong.",
    data: { requestId: (req as any).id },
  });
});

const PARTICIPANT_SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const runParticipantSweep = () =>
  bestEffort("participant-sweep", () => ParticipantService.closeDanglingForEndedMeetings());
setTimeout(runParticipantSweep, 60 * 1000).unref();
setInterval(runParticipantSweep, PARTICIPANT_SWEEP_INTERVAL_MS).unref();

const ORPHAN_SWEEP_INTERVAL_MS = 30 * 60 * 1000;
const runOrphanSweep = () => bestEffort("orphan-sweep", () => sweepOrphans());
setTimeout(runOrphanSweep, 90 * 1000).unref();
setInterval(runOrphanSweep, ORPHAN_SWEEP_INTERVAL_MS).unref();

const EMAIL_RETRY_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const runEmailRetrySweep = () => bestEffort("email-retry-sweep", () => EmailService.retrySweep());
setTimeout(runEmailRetrySweep, 120 * 1000).unref();
setInterval(runEmailRetrySweep, EMAIL_RETRY_SWEEP_INTERVAL_MS).unref();

const METRICS_REFRESH_INTERVAL_MS = 30 * 1000;
const refreshMetricGauges = () =>
  bestEffort("metrics-gauge-refresh", async () => {
    socketConnections.set(socket.getConnectionCount());
    mongoUp.set(mongoose.connection.readyState === 1 ? 1 : 0);
    emailQueueDepth.set(await EmailService.queueDepth());
  });
setTimeout(refreshMetricGauges, 15 * 1000).unref();
setInterval(refreshMetricGauges, METRICS_REFRESH_INTERVAL_MS).unref();

server.listen(PORT, () => {
  logger.info({ port: PORT }, "server listening");
});

let shuttingDown = false;
async function gracefulShutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");

  const hardExit = setTimeout(() => {
    logger.fatal("graceful shutdown timed out; forcing exit");
    process.exit(1);
  }, 10_000);
  hardExit.unref();

  server.close(() => logger.info("http server closed"));
  await socket.closeSockets();
  await disconnectDb();

  clearTimeout(hardExit);
  logger.info({ exitCode }, "shutdown complete");
  process.exit(exitCode);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason, event: "unhandledRejection" }, "unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err, event: "uncaughtException" }, "uncaught exception");
  gracefulShutdown("uncaughtException", 1);
});
