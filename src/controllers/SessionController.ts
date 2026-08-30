import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import * as SessionService from "../services/SessionService";
import * as EventService from "../services/EventService";

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const event = await EventService.getOneById(req.body.event);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID.",
      });
    }

    if (event.user._id.toString() !== req.user._id) {
      return res.status(403).json({
        status: "error",
        message: "You are not the organizer of this event.",
      });
    }

    let session = await SessionService.create({
      title: req.body.title,
      description: req.body.description,
      speaker_info: req.body.speaker_info,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      event: req.body.event
    });

    if (!session) {
      return res.status(500).json({
        status: "error",
        message: "Error creating session.",
      });
    } 

    return res.status(201).json({
      status: "success",
      message: "Create session successfully.",
      data: session
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function getAll(req: any, res: Response) {
  try {
    const sessions = await SessionService.getAll(req.headers["event-id"]);

    if (sessions.length < 1) {
      return res.status(200).json({
        status: "error",
        message: "There is no session found."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetch sessions successfully.",
      data: sessions
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getOneById(req: Request, res: Response) {
  try {
    const session = await SessionService.getOneById(req.params.id as string);

    return res.status(200).json({
      status: "success",
      message: "Fetch session successfully.",
      data: session
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function update(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    let session = await SessionService.update(req.params.id, {
      title: req.body.title,
      description: req.body.description,
      speaker_info: req.body.speaker_info,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
    });

    if (!session) {
      return res.status(500).json({
        status: "error",
        message: "Error updating session.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Update session successfully.",
      data: session
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function deleteOne(req: any, res: Response) {
  try {
    await SessionService.deleteOne(req.params.id as string);

    return res.status(200).json({
      status: "success",
      message: "Delete session successfully."
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}
