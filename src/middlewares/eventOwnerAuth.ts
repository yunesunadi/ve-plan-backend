import { NextFunction, Response } from "express";
import * as EventService from "../services/EventService";

module.exports = async (req: any, res: Response, next: NextFunction) => {
  const event = await EventService.getOneById(req.params.id);

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

  req.event = event;
  next();
};
