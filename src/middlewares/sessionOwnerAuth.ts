import { NextFunction, Response } from "express";
import mongoose from "mongoose";
import * as SessionService from "../services/SessionService";
import * as EventService from "../services/EventService";

module.exports = async (req: any, res: Response, next: NextFunction) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({
      status: "error",
      message: "There is no session with this ID."
    });
  }

  const session = await SessionService.getOneById(req.params.id);

  if (!session) {
    return res.status(404).json({
      status: "error",
      message: "There is no session with this ID."
    });
  }

  const event = await EventService.getOneById(session.event.toString());

  if (!event) {
    return res.status(404).json({
      status: "error",
      message: "There is no event with this ID."
    });
  }

  if (event.user._id.toString() !== req.user._id) {
    return res.status(403).json({
      status: "error",
      message: "You are not the organizer of this event."
    });
  }

  req.session_doc = session;
  req.event = event;
  next();
};
