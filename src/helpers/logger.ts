import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const level = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

export const logger = pino({
  level,
  base: { service: "ve-plan-api" },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }),
});

export default logger;
