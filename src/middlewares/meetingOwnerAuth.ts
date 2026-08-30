import { NextFunction, Response } from "express";
import mongoose from "mongoose";
import * as MeetingService from "../services/MeetingService";

module.exports = async (req: any, res: Response, next: NextFunction) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({
      status: "error",
      message: "There is no meeting for this event."
    });
  }

  const meeting = await MeetingService.getOneById(req.params.id, req.user._id);

  if (!meeting) {
    return res.status(404).json({
      status: "error",
      message: "There is no meeting for this event."
    });
  }

  req.meeting = meeting;
  next();
};
