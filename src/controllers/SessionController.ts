import { Request, Response } from "express";
import mongoose from "mongoose";
import { isRequestInvalid } from "../helpers/utils";
import { endNotAfterStart } from "../helpers/time";
import { deriveInstants } from "../helpers/eventTime";
import * as SessionService from "../services/SessionService";
import * as EventService from "../services/EventService";

function sessionTimeError(event: any, start: string, end: string): string | null {
  if (endNotAfterStart(start, end)) {
    return "Session end time must be after its start time.";
  }

  // Compose the session's times onto the event's calendar day, in the event's
  // timezone, and compare the resulting instants against the event's own
  // derived window (H-EVT-04). Sessions carry no date or timezone of their own.
  const timezone = event.timezone;
  const session = deriveInstants({ date: event.date, start_time: start, end_time: end, timezone });
  const fallback = deriveInstants({
    date: event.date, start_time: event.start_time, end_time: event.end_time, timezone,
  });
  const eventStart = event.starts_at ? new Date(event.starts_at).getTime() : fallback.starts_at.getTime();
  const eventEnd = event.ends_at ? new Date(event.ends_at).getTime() : fallback.ends_at.getTime();

  if (session.starts_at.getTime() < eventStart || session.ends_at.getTime() > eventEnd) {
    return "Session must fall within the event's start and end time.";
  }
  return null;
}

async function loadVisibleSessions(event_id: string, user_id: string, res: Response) {
  const event = await EventService.getOneById(event_id);

  if (!event) {
    res.status(404).json({ status: "error", message: "There is no event with this ID." });
    return null;
  }

  if (!await EventService.canUserView(event, user_id)) {
    res.status(404).json({ status: "error", message: "There is no event with this ID." });
    return null;
  }

  return await SessionService.getAll(event_id);
}

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

    const time_error = sessionTimeError(event, req.body.start_time, req.body.end_time);
    if (time_error) {
      return res.status(400).json({ status: "error", message: time_error });
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
    const event_id = String(req.headers["event-id"] ?? "");

    if (!mongoose.isValidObjectId(event_id)) {
      return res.status(400).json({
        status: "error",
        message: "A valid event-id header is required."
      });
    }

    const sessions = await loadVisibleSessions(event_id, req.user._id, res);
    if (!sessions) return;

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

export async function getForEvent(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const sessions = await loadVisibleSessions(req.params.id, req.user._id, res);
    if (!sessions) return;

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

export async function getOneById(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const session = await SessionService.getOneById(req.params.id as string);

    if (!session) {
      return res.status(404).json({
        status: "error",
        message: "There is no session with this ID."
      });
    }

    const event = await EventService.getOneById(session.event.toString());

    if (!event || !await EventService.canUserView(event, req.user._id)) {
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
       message: "Something went wrong."
     });
   }
}

export async function update(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const time_error = sessionTimeError(req.event, req.body.start_time, req.body.end_time);
    if (time_error) {
      return res.status(400).json({ status: "error", message: time_error });
    }

    let session = await SessionService.update(req.params.id, {
      title: req.body.title,
      description: req.body.description,
      speaker_info: req.body.speaker_info,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
    });

    if (!session) {
      return res.status(404).json({
        status: "error",
        message: "There is no session with this ID.",
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
    const deleted = await SessionService.deleteOne(req.params.id as string);

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "There is no session with this ID."
      });
    }

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
