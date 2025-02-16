import { Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const MeetingService = require("../services/MeetingService");

export async function createToken(req: any, res: Response) {
  try { 
    const meeting_token = await MeetingService.createToken(req.user.name, req.user.email);

    if (!meeting_token) {
      return res.status(500).json({
        status: "error",
        message: "Error creating meeting token.",
      });
    } 

    return res.status(201).json({
      status: "success",
      message: "Create meeting token successfully.",
      token: meeting_token
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;
    
    const meeting = await MeetingService.create({
      event: req.body.event,
      user: req.user._id,
      room_name: req.body.room_name,
      token: req.body.token
    });

    if (!meeting) {
      return res.status(500).json({
        status: "error",
        message: "Error creating meeting.",
      });
    } 

    return res.status(201).json({
      status: "success",
      message: "Create meeting successfully.",
      data: meeting
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function isCreated(req: any, res: Response) {
  try {
    const meeting = await MeetingService.getOneById(req.params.id, req.user._id);
    
    if (!meeting) {
      return res.status(200).json({
        status: "success",
        message: "There is no meeting for this event.",
        is_created: false
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Meeting for this event is already created.",
      is_created: true,
    });
 } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}
