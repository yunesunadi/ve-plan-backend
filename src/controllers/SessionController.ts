import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const SessionService = require("../services/SessionService");

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;
    
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
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function getAll(req: any, res: Response) {
  try {
    const sessions = await SessionService.getAll(req.headers["event-id"]);

    if (!sessions) {
      return res.status(404).json({
        status: "error",
        message: "There is no event found."
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
       message: "Something went wrong.",
       error: err
     });
   }
}

export async function getOneById(req: Request, res: Response) {
  try {
    const session = await SessionService.getOneById(req.params.id);

    if (!session) {
      return res.status(404).json({
        status: "error",
        message: "There is no session with this ID."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetch session successfully.",
      data: session
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

export async function update(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    let session = await SessionService.update(req.params.id, req.body);

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
      message: "Something went wrong.",
      error: err
    });
  }
}