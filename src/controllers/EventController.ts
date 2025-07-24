import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import * as EventService from "../services/EventService";
import * as NotificationService from "../services/NotificationService";

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const filename = req.file?.filename;
    const created_date = new Date(req.body.date).getTime();
    const current_date = new Date().getTime();
    const one_day = 24 * 60 * 60 * 1000;
    
    if (created_date < (current_date - one_day)) {
      return res.status(409).json({
        status: "error",
        message: "Can't create an event in past days."
      });
    }
    
    let event = await EventService.create({
      cover: filename,
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      category: req.body.category,
      type: req.body.type,
      user: req.user._id
    });

    if (!event) {
      return res.status(500).json({
        status: "error",
        message: "Error creating event.",
      });
    } 

    if (event.type === "public") {
      await NotificationService.sendEventCreated(event);
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
    const events = await EventService.getAll(req.user.role);

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

export async function getAllByQuery(req: any, res: Response) {
  try {
    const events = await EventService.getAllByQuery(req.query);

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

export async function getMyEvents(req: any, res: Response) {
  try {
    const events = await EventService.getMyEvents(req.query, req.user._id);

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

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetch event successfully.",
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

export async function update(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;
    
    let updated_data;

    if (req.file) {
      updated_data = {
        ...req.body,
        cover: req.file.filename
      };
    } else {
      updated_data = req.body;
    }
    
    let event = await EventService.update(req.params.id, updated_data);

    if (!event) {
      return res.status(500).json({
        status: "error",
        message: "Error updating event.",
      });
    } 

    if (event.type === "public") {
      await NotificationService.sendEventUpdated(event);
    }

    return res.status(200).json({
      status: "success",
      message: "Update event successfully.",
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

export async function deleteOne(req: Request, res: Response) {
  try {
    const event = await EventService.getOneById(req.params.id);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID."
      });
    }

    await EventService.deleteOne(req.params.id);

    return res.status(200).json({
      status: "success",
      message: "Delete event successfully."
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
