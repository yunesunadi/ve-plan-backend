import { NextFunction, Response } from "express";

module.exports = (req: any, res: Response, next: NextFunction) => {
  if (req.user.role !== "attendee") {
    return res.status(403).json({
      status: "error",
      message: "Unauthorized access."
    });
  }
  next();
};
