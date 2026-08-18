import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";

export function isRequestInvalid(req: Request, res: Response) {
  const errors = validationResult(req);

  if(errors.array().length > 0) {
    res.status(400).json({
      status: "error",
      message: "Validation error",
      error: errors.array().map((err: any) => ({ value: err.path, msg: err.msg  }))
    });
    return true;
  }

  return false;
}

export function objectId(id: string) {
  const _id = new mongoose.Types.ObjectId(id);
  return _id;
}

export function isEventExpired(event_date: Date | string, event_end_time: Date | string) {
  const date = new Date(event_date);
  const time = new Date(event_end_time);

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const milliseconds = time.getMilliseconds();

  const event_datetime = new Date(year, month, day, hours, minutes, seconds, milliseconds).getTime();
  const current_datetime = new Date().getTime();

  return event_datetime < current_datetime;
}