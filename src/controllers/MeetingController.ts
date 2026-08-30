import { Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import * as MeetingService from "../services/MeetingService";
import * as EventService from "../services/EventService";
import * as EventRegisterService from "../services/EventRegisterService";
import * as EventInviteService from "../services/EventInviteService";
import * as EmailService from "../services/EmailService";
import * as NotificationService from "../services/NotificationService";

async function getParticipation(event_id: string, user_id: string) {
  const [registered, invited] = await Promise.all([
    EventRegisterService.getHasRegistered(event_id, user_id),
    EventInviteService.getHasInvited(event_id, user_id),
  ]);

  const approved_registrant = Boolean(registered && registered.register_approved);
  const accepted_invitee = Boolean(invited && invited.invitation_accepted);
  const notified = Boolean((registered && registered.meeting_started) || (invited && invited.meeting_started));

  return {
    is_participant: approved_registrant || accepted_invitee,
    notified,
  };
}

export async function createToken(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const event_id = req.body.event_id;
    const event = await EventService.getOneById(event_id);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID.",
      });
    }

    const meeting = await MeetingService.getOneByEventId(event_id);

    if (!meeting) {
      return res.status(404).json({
        status: "error",
        message: "There is no meeting for this event.",
      });
    }

    const is_owner = event.user._id.toString() === req.user._id;

    if (!is_owner) {
      const { is_participant, notified } = await getParticipation(event_id, req.user._id);

      if (!is_participant) {
        return res.status(403).json({
          status: "error",
          message: "You are not a participant of this event.",
        });
      }

      if (meeting.ended) {
        return res.status(403).json({
          status: "error",
          message: "This meeting has ended.",
        });
      }

      if (!notified) {
        return res.status(403).json({
          status: "error",
          message: "The host has not started this meeting yet.",
        });
      }
    }

    const meeting_token = MeetingService.createToken(
      req.user.name,
      req.user.email,
      is_owner,
      meeting.room_name
    );

    if (!meeting_token) {
      return res.status(500).json({
        status: "error",
        message: "Error creating meeting token.",
      });
    }

    return res.status(201).json({
      status: "success",
      message: "Create meeting token successfully.",
      token: meeting_token,
      room_name: meeting.room_name,
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
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

    const existing = await MeetingService.getOneById(req.body.event, req.user._id);

    if (existing) {
      return res.status(409).json({
        status: "error",
        message: "A meeting already exists for this event.",
      });
    }

    const meeting = await MeetingService.create({
      event: req.body.event,
      user: req.user._id,
      room_name: MeetingService.generateRoomName(),
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
      message: "Something went wrong."
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
      message: "Something went wrong."
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
      message: "Something went wrong."
    });
  }
}

export async function getOneById(req: any, res: Response) {
  try {
    return res.status(200).json({
      status: "success",
      message: "Fetch meeting successfully.",
      data: req.meeting
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getOneByEventId(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const event_id = req.params.id;
    const event = await EventService.getOneById(event_id);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "There is no event with this ID.",
      });
    }

    const meeting = await MeetingService.getOneByEventId(event_id);

    if (!meeting) {
      return res.status(404).json({
        status: "error",
        message: "There is no meeting for this event.",
      });
    }

    const { is_participant, notified } = await getParticipation(event_id, req.user._id);

    if (!is_participant || !notified) {
      return res.status(403).json({
        status: "error",
        message: "You are not a participant of this event.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetch meeting successfully.",
      data: {
        room_name: meeting.room_name,
        ended: meeting.ended,
        starts_at: meeting.start_time,
      }
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function isExpired(_req: any, res: Response) {
  try {
    return res.status(200).json({
      status: "success",
      message: "Meeting isn't expired.",
      is_expired: false
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function updateStartTime(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const updated_meeting = await MeetingService.update(req.meeting._id, {
      start_time: req.body.start_time
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
      message: "Something went wrong."
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
    const meeting = req.meeting;
    const updated_meeting = await MeetingService.setEnded(meeting._id, true);

    if (!updated_meeting) {
      return res.status(200).json({
        status: "success",
        message: "Meeting is already ended.",
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
      message: "Something went wrong."
    });
  }
}

export async function reopenMeeting(req: any, res: Response) {
  try {
    const meeting = req.meeting;
    const updated_meeting = await MeetingService.setEnded(meeting._id, false);

    if (!updated_meeting) {
      return res.status(200).json({
        status: "success",
        message: "Meeting is not ended.",
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
      message: "Something went wrong."
    });
  }
}

export async function updateEndTime(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const meeting = req.meeting;
    let duration: number | null = null;

    if (meeting.start_time) {
      const milisecond = new Date(req.body.end_time).getTime() - new Date(meeting.start_time).getTime();
      duration = Math.round(milisecond / 60000);
    }

    const updated_meeting = await MeetingService.update(meeting._id, {
      end_time: req.body.end_time,
      duration
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
      message: "Something went wrong."
    });
  }
}
