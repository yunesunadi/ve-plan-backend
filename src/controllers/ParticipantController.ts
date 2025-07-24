import { Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import * as ParticipantService from "../services/ParticipantService";
import * as MeetingService from "../services/MeetingService";

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const existing = await ParticipantService.getOne(req.body.event, req.user._id);

    if (existing) {
      return res.status(409).json({
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
    const milisecond = new Date(req.body.end_time).getTime() - new Date(participant.start_time).getTime();
    const minute = Math.round(milisecond / 60000);
    const updated_participant = await ParticipantService.update(participant._id, {
      ...req.body,
      duration: minute
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

export async function updateNoEndTime(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const participants = await ParticipantService.getAllWithNoEndTime(req.params.id);

    if (participants.length < 1) {
      return res.status(200).json({
        status: "error",
        message: "No participant found.",
      });
    }

    participants.forEach(async (participant: any) => {
      const milisecond = new Date().getTime() - new Date(participant.start_time).getTime();
      const minute = Math.round(milisecond / 60000);
      await ParticipantService.update(participant._id, {
        end_time: new Date().toISOString(),
        duration: minute
      });
    });

    return res.status(200).json({
      status: "success",
      message: "Update participants successfully.",
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

export async function getAll(req: any, res: Response) {
  try {
    const participants = await ParticipantService.getAll(req.params.id);

    return res.status(200).json({
      status: "success",
      message: "Fetch participant successfully.",
      data: participants
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

export async function getStayTimes(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const meeting = await MeetingService.getOneById(req.params.id, req.user._id);
    const participants = await ParticipantService.getAll(req.params.id);
    
    const fraction = (meeting && meeting.duration && (Math.round(meeting.duration / 4) + 1)) || 0;
    const first = `${0} - ${fraction} min`;
    const second = `${fraction} - ${fraction * 2} min`;
    const third = `${fraction * 2} - ${fraction * 3} min`;
    const fourth = `${fraction * 3} - ${fraction * 4} min`;

    let data = [
      {
        label: first,
        value: 0
      },
      {
        label: second,
        value: 0
      },
      {
        label: third,
        value: 0
      },
      {
        label: fourth,
        value: 0
      },
    ];

    participants.forEach((participant: any) => {
      data = data.map((item) => {
        if (
          participant.duration >= 0 && participant.duration <= fraction && item.label === first
          || participant.duration > fraction && participant.duration <= fraction * 2 && item.label === second
          || participant.duration > fraction * 2 && participant.duration <= fraction * 3 && item.label === third
          || participant.duration > fraction * 3 && participant.duration <= fraction * 4 && item.label === fourth
        ) {
          return { ...item, value: item.value + 1 };
        }
        return item;
      });
    });

    return res.status(200).json({
      status: "success",
      message: "Fetch stay times successfully.",
      data
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
