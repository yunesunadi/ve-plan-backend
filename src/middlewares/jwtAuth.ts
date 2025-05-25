import { NextFunction, Response } from "express";
import passport from "passport";

module.exports = [
  passport.authenticate("jwt", { session: false }),
  (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthenticated access."
      });
    }
    next();
  }
];