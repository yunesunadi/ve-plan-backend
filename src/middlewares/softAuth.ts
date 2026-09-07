import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export default function softAuth(req: any, _res: Response, next: NextFunction) {
  const header = (req as Request).headers.authorization;
  const token = typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : "";

  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = { _id: decoded._id, role: decoded.role };
    } catch {
      // invalid / expired token — proceed anonymously
    }
  }

  next();
}
