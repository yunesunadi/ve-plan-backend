import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const EventService = require("../services/EventService");

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const filename = req.file?.filename;
    
    let event = await EventService.create({
      cover: filename,
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      category: req.body.category,
      type: req.body.type,
      organizer_id: req.user._id
    });

    if (!event) {
      return res.status(500).json({
        status: "error",
        message: "Error creating event.",
      });
    } 

    return res.status(201).json({
      status: "success",
      message: "Create event successfully.",
      data: event
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
    const events = await EventService.getAll(req.user._id);

    if (!events) {
      return res.status(500).json({
        status: "error",
        message: "Error fetching events."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetch events successfully.",
      data: events
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
    const event = await EventService.getOneById(req.params.id);

    if (!event[0]) {
      return res.status(500).json({
        status: "error",
        message: "Error fetching an event."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetch event successfully.",
      data: event[0]
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
