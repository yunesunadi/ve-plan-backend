import { Request, Response, NextFunction } from "express";
import { httpRequestDuration, httpRequestsTotal } from "../helpers/metrics";

export default function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const routePath = (req as any).route?.path;
    const route =
      typeof routePath === "string"
        ? `${req.baseUrl || ""}${routePath === "/" ? "" : routePath}` || "/"
        : "unmatched";
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    end(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
}
