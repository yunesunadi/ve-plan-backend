import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const EventService = require("../services/EventService");

export async function create(req: Request, res: Response) {
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

export async function getAll(req: Request, res: Response) {
  try {
    const events = await EventService.getAll();

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
