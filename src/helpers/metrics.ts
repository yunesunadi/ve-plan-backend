import client from "prom-client";

export const register = new client.Registry();
register.setDefaultLabels({ service: "ve-plan-api" });
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.05, 0.1, 0.3, 0.5, 0.8, 1, 2, 5],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

export const socketConnections = new client.Gauge({
  name: "socket_connections",
  help: "Current number of connected Socket.IO clients",
  registers: [register],
});

export const emailQueueDepth = new client.Gauge({
  name: "email_queue_depth",
  help: "EmailLog rows awaiting delivery (pending + retryable failed)",
  registers: [register],
});

export const mongoUp = new client.Gauge({
  name: "mongo_up",
  help: "1 if the MongoDB connection is ready, 0 otherwise",
  registers: [register],
});
