import { Response } from "express";
import { isRequestInvalid } from "../helpers/utils";

const clamp = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.length > 0 ? v.slice(0, max) : undefined;

export function report(req: any, res: Response) {
  if (isRequestInvalid(req, res)) return;

  req.log.error(
    {
      event: "client_error",
      clientError: {
        message: clamp(req.body.message, 2000),
        stack: clamp(req.body.stack, 8000),
        url: clamp(req.body.url, 2000),
        userAgent: clamp(req.body.userAgent, 500) ?? clamp(req.headers["user-agent"], 500),
      },
      user: req.user?._id,
    },
    "SPA error"
  );

  return res.status(204).send();
}

export default { report };
