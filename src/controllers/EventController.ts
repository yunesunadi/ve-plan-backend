import { Response } from "express";
import mongoose from "mongoose";
import { isRequestInvalid } from "../helpers/utils";
import { verifyImageFile, removeUpload } from "../helpers/uploads";
import * as EventService from "../services/EventService";
import * as NotificationService from "../services/NotificationService";
import * as EventRegisterService from "../services/EventRegisterService";
import * as EventInviteService from "../services/EventInviteService";

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    if (!verifyImageFile(req.file)) {
      return res.status(415).json({
        status: "error",
        message: "The cover must be a valid JPEG, PNG, or WebP image.",
      });
    }

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
      message: "Something went wrong."
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
       message: "Something went wrong."
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
       message: "Something went wrong."
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
       message: "Something went wrong."
     });
   }
}

export async function getOneById(req: any, res: Response) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID."
      });
    }

    const event = await EventService.getOneById(req.params.id as string);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID."
      });
    }

    if (event.type !== "public") {
      let has_access = event.user._id.toString() === req.user._id;

      if (!has_access) {
        const [registered, invited] = await Promise.all([
          EventRegisterService.getHasRegistered(req.params.id, req.user._id),
          EventInviteService.getHasInvited(req.params.id, req.user._id),
        ]);
        has_access = Boolean(registered || invited);
      }

      if (!has_access) {
        return res.status(404).json({
          status: "error",
          message: "There is no event with this ID."
        });
      }
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
       message: "Something went wrong."
     });
   }
}

export async function update(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    if (!verifyImageFile(req.file)) {
      return res.status(415).json({
        status: "error",
        message: "The cover must be a valid JPEG, PNG, or WebP image.",
      });
    }

    const updated_data: any = {
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      category: req.body.category,
      type: req.body.type,
    };

    if (req.file) {
      updated_data.cover = req.file.filename;
    }

    let event = await EventService.update(req.params.id, updated_data);

    if (event && req.file && req.event?.cover && req.event.cover !== req.file.filename) {
      removeUpload(req.event.cover, "covers");
    }

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
      message: "Something went wrong."
    });
  }
}

export async function deleteOne(req: any, res: Response) {
  try {
    const deleted = await EventService.deleteOne(req.params.id as string);

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID."
      });
    }

    removeUpload(deleted.cover ?? req.event?.cover, "covers");

    return res.status(200).json({
      status: "success",
      message: "Delete event successfully."
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}
