import { NextFunction, Response } from "express";
import passport from "passport";
import * as UserService from "../services/UserService";

async function checkUser(req: any, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        status: "error",
        message: "Unauthenticated access."
      });
    }

    const user = await UserService.findAuthContext(req.user._id);

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthenticated access."
      });
    }

    if (req.user.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        status: "error",
        message: "Your session has expired. Please sign in again."
      });
    }

    req.user = {
      _id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
      tokenVersion: user.tokenVersion
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = [
  passport.authenticate("jwt", { session: false }),
  checkUser
];
