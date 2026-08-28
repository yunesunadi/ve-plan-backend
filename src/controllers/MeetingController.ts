import { Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import { jwtDecode } from "jwt-decode";
import * as MeetingService from "../services/MeetingService";
import * as EventRegisterService from "../services/EventRegisterService";
import * as EventInviteService from "../services/EventInviteService";
import * as EmailService from "../services/EmailService";
import * as NotificationService from "../services/NotificationService";

export async function createToken(req: any, res: Response) {
  try { 
    const meeting_token = await MeetingService.createToken(req.user.name, req.user.email, req.body.is_moderator);

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

    const existing = await MeetingService.getOneById(req.body.event, req.user._id);

    if (existing) {
      return res.status(500).json({
        status: "error",
        message: "Existing meeting.",
      });
    }
    
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

export async function isStarted(req: any, res: Response) {
  try {
    const meeting = await MeetingService.getOneByEventId(req.params.id);
    const registered = await EventRegisterService.getHasRegistered(req.params.id, req.user._id);
    const invited = await EventInviteService.getHasInvited(req.params.id, req.user._id);
    
    if (meeting && !meeting.ended && ((registered && registered.meeting_started) || (invited && invited.meeting_started))) {
      return res.status(200).json({
        status: "success",
        message: "Meeting for this event has already started.",
        is_started: true,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "There is no meeting for this event.",
      is_started: false
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

export async function getOneById(req: any, res: Response) {
  try {
    const meeting = await MeetingService.getOneById(req.params.id, req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Fetch meeting successfully.",
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

export async function getOneByEventId(req: any, res: Response) {
  try {
    const meeting = await MeetingService.getOneByEventId(req.params.id);

    return res.status(200).json({
      status: "success",
      message: "Fetch meeting successfully.",
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

export async function isExpired(req: any, res: Response) {
  try {
    const meeting = await MeetingService.getOneByEventId(req.params.id);
    const current_time = Math.round(new Date().getTime() / 1000);
    const expired_time = (meeting && jwtDecode(meeting.token).exp) || current_time;

    if ((expired_time - current_time) < 0) {
      return res.status(200).json({
        status: "success",
        message: "Meeting is expired.",
        is_expired: true
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Meeting isn't expired.",
      is_expired: false
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

export async function updateStartTime(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const meeting = await MeetingService.getOneById(req.params.id, req.user._id);
    const updated_meeting = await MeetingService.update(meeting._id, req.body);
    
    if (!updated_meeting) {
      return res.status(500).json({
        status: "error",
        message: "Error updating meeting.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Update meeting successfully.",
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

async function notifyMeetingAttendees(event_id: string, event_title: string, action: "meeting_started" | "meeting_ended") {
  const registered = await EventRegisterService.getAllMeetingStartedByEventId(event_id);
  const invited = await EventInviteService.getAllMeetingStartedByEventId(event_id);

  const recipients = [...new Map(
    [...registered, ...invited]
      .filter((item: any) => item.user)
      .map((item: any) => [String(item.user._id), item.user])
  ).values()];

  await Promise.all(recipients.map(async (user: any) => {
    await EmailService.send({
      action,
      recipient: user.email,
      additional: {
        name: user.name,
        event_title,
      }
    });
  }));

  const user_id_list = recipients.map((user: any) => String(user._id));

  if (action === "meeting_ended") {
    await NotificationService.sendMeetingEnded(user_id_list, event_title);
  } else {
    await NotificationService.sendMeetingStarted(user_id_list, event_title);
  }
}

export async function endMeeting(req: any, res: Response) {
  try {
    const meeting = await MeetingService.getOneById(req.params.id, req.user._id);

    if (!meeting) {
      return res.status(404).json({
        status: "error",
        message: "There is no meeting for this event.",
      });
    }

    const updated_meeting = await MeetingService.setEnded(meeting._id, true);

    if (!updated_meeting) {
      return res.status(500).json({
        status: "error",
        message: "Error ending meeting.",
      });
    }

    await notifyMeetingAttendees(req.params.id, meeting.event.title, "meeting_ended");

    return res.status(200).json({
      status: "success",
      message: "Meeting ended.",
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

export async function reopenMeeting(req: any, res: Response) {
  try {
    const meeting = await MeetingService.getOneById(req.params.id, req.user._id);

    if (!meeting) {
      return res.status(404).json({
        status: "error",
        message: "There is no meeting for this event.",
      });
    }

    const updated_meeting = await MeetingService.setEnded(meeting._id, false);

    if (!updated_meeting) {
      return res.status(500).json({
        status: "error",
        message: "Error reopening meeting.",
      });
    }

    await notifyMeetingAttendees(req.params.id, meeting.event.title, "meeting_started");

    return res.status(200).json({
      status: "success",
      message: "Meeting reopened.",
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

export async function updateEndTime(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const meeting = await MeetingService.getOneById(req.params.id, req.user._id);
    const milisecond = new Date(req.body.end_time).getTime() - new Date(meeting.start_time).getTime();
    const minute = Math.round(milisecond / 60000);
    const updated_meeting = await MeetingService.update(meeting._id, {
      ...req.body,
      duration: minute
    });
    
    if (!updated_meeting) {
      return res.status(500).json({
        status: "error",
        message: "Error updating meeting.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Update meeting successfully.",
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
