import { Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const ParticipantService = require("../services/ParticipantService");

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const existing = await ParticipantService.getOne(req.body.event, req.user._id);

    if (existing) {
      return res.status(500).json({
        status: "error",
        message: "Existing participant.",
      });
    }

    const participant = await ParticipantService.create({
      event: req.body.event,
      user: req.user._id,
      room_name: req.body.room_name,
      start_time: req.body.start_time
    });

    if (participant) {
      return res.status(201).json({
        status: "success",
        message: "Create participant successfully.",
      });
    }
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function update(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const participant = await ParticipantService.getOne(req.params.id, req.user._id);
    const updated_participant = await ParticipantService.update(participant._id, {
      ...req.body,
      duration: new Date(req.body.end_time).getMinutes() - new Date(participant.start_time).getMinutes()
    });
    
    if (!updated_participant) {
      return res.status(500).json({
        status: "error",
        message: "Error updating participant.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Update participant successfully.",
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

