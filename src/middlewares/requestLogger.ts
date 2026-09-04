import { randomUUID } from "crypto";
import pinoHttp from "pino-http";
import type { IncomingMessage, ServerResponse } from "http";
import logger from "../helpers/logger";

const MAX_REQUEST_ID_LENGTH = 128;

const requestLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const inbound = req.headers["x-request-id"];
    const raw = Array.isArray(inbound) ? inbound[0] : inbound;
    const id =
      typeof raw === "string" && raw.trim().length > 0
        ? raw.trim().slice(0, MAX_REQUEST_ID_LENGTH)
        : randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  autoLogging: true,
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req: any) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
  },
});

export default requestLogger;
