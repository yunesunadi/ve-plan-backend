import { Response } from "express";
import { isRequestInvalid, bestEffort, joinWindowState, meetingIsLive } from "../helpers/utils";
import * as MeetingService from "../services/MeetingService";
import * as EventService from "../services/EventService";
import * as EventRegisterService from "../services/EventRegisterService";
import * as EventInviteService from "../services/EventInviteService";
import * as ParticipantService from "../services/ParticipantService";
import * as EmailService from "../services/EmailService";
import * as NotificationService from "../services/NotificationService";

function formatWindowTime(ms: number): string {
  return new Date(ms).toISOString();
}

async function getParticipation(event_id: string, user_id: string) {
  const [registered, invited] = await Promise.all([
    EventRegisterService.getHasRegistered(event_id, user_id),
    EventInviteService.getHasInvited(event_id, user_id),
  ]);

  const approved_registrant = Boolean(registered && registered.register_approved);
  const accepted_invitee = Boolean(invited && invited.invitation_accepted);

  return { is_participant: approved_registrant || accepted_invitee };
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
    const join_window = joinWindowState(event);

    if (meeting.ended) {
      return res.status(403).json({
        status: "error",
        message: "This meeting has ended.",
      });
    }

    if (join_window.state === "closed") {
      return res.status(403).json({
        status: "error",
        message: "The join window for this event has closed.",
      });
    }

    if (join_window.state === "early") {
      return res.status(403).json({
        status: "error",
        message: `This meeting can be joined from ${formatWindowTime(join_window.opensAt)}.`,
      });
    }

    if (!is_owner) {
      const { is_participant } = await getParticipation(event_id, req.user._id);

      if (!is_participant) {
        return res.status(403).json({
          status: "error",
          message: "You are not a participant of this event.",
        });
      }

      if (!meeting.host_present) {
        return res.status(409).json({
          status: "error",
          message: "The host hasn't started this meeting yet.",
        });
      }

      const [present, existing_participant] = await Promise.all([
        ParticipantService.countPresent(event_id),
        ParticipantService.getOne(event_id, req.user._id),
      ]);
      const already_in = Boolean(existing_participant && !existing_participant.end_time);

      if (!already_in && present >= (meeting.capacity || 25)) {
        return res.status(409).json({
          status: "error",
          message: "This meeting is full.",
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
    req.log.error({ err }, "MeetingController.createToken failed");
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

    if (joinWindowState(event).state === "closed") {
      return res.status(409).json({
        status: "error",
        message: "This event has ended, so a meeting can no longer be created.",
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
    req.log.error({ err }, "MeetingController.create failed");
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
    req.log.error({ err }, "MeetingController.isCreated failed");
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function isStarted(req: any, res: Response) {
  try {
    const meeting = await MeetingService.getOneByEventId(req.params.id);
    const is_started = meetingIsLive(meeting);

    return res.status(200).json({
      status: "success",
      message: is_started
        ? "The meeting for this event is live."
        : "The meeting for this event is not live.",
      is_started,
    });
 } catch (err: any) {
    req.log.error({ err }, "MeetingController.isStarted failed");
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
     req.log.error({ err }, "MeetingController.getOneById failed");
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

    const { is_participant } = await getParticipation(event_id, req.user._id);

    if (!is_participant) {
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
     req.log.error({ err }, "MeetingController.getOneByEventId failed");
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function isExpired(req: any, res: Response) {
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
    const is_owner = event.user._id.toString() === req.user._id;

    if (!is_owner) {
      const { is_participant } = await getParticipation(event_id, req.user._id);

      if (!is_participant) {
        return res.status(403).json({
          status: "error",
          message: "You are not a participant of this event.",
        });
      }
    }

    if (!meeting) {
      return res.status(200).json({
        status: "success",
        message: "There is no meeting for this event.",
        exists: false,
        is_expired: false,
      });
    }

    const is_expired = meeting.ended || joinWindowState(event).state === "closed";

    return res.status(200).json({
      status: "success",
      message: is_expired ? "Meeting is expired." : "Meeting isn't expired.",
      exists: true,
      is_expired,
    });
  } catch (err: any) {
    req.log.error({ err }, "MeetingController.isExpired failed");
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function updateStartTime(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const meeting = req.meeting;
    const now = new Date();

    const patch: any = { host_present: true };
    if (!meeting.start_time) patch.start_time = now;
    if (!meeting.started_at) patch.started_at = now;

    const updated_meeting = await MeetingService.update(meeting._id, patch);

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
    req.log.error({ err }, "MeetingController.updateStartTime failed");
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

  await EmailService.sendBatch(recipients.map((user: any) => ({
    action,
    recipient: user.email,
    additional: { name: user.name, event_title },
  })), { event: event_id });

  const user_id_list = recipients.map((user: any) => String(user._id));
  const event_ref = { _id: event_id, title: event_title };

  if (action === "meeting_ended") {
    await NotificationService.sendMeetingEnded(user_id_list, event_ref);
  } else {
    await NotificationService.sendMeetingStarted(user_id_list, event_ref);
  }
}

export async function endMeeting(req: any, res: Response) {
  try {
    const meeting = req.meeting;
    const now = new Date();
    const updated_meeting = await MeetingService.setEnded(meeting._id, true);

    if (!updated_meeting) {
      return res.status(200).json({
        status: "success",
        message: "Meeting is already ended.",
      });
    }

    let duration: number | null = null;
    if (meeting.start_time) {
      duration = Math.max(0, Math.round((now.getTime() - new Date(meeting.start_time).getTime()) / 60000));
    }

    await MeetingService.update(meeting._id, { end_time: now, duration, host_present: false });
    await bestEffort("close-dangling-participants", () =>
      ParticipantService.closeDanglingForEvent(meeting.event._id, now)
    );
    await notifyMeetingAttendees(req.params.id, meeting.event.title, "meeting_ended");

    return res.status(200).json({
      status: "success",
      message: "Meeting ended.",
    });
  } catch (err: any) {
    req.log.error({ err }, "MeetingController.endMeeting failed");
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
    req.log.error({ err }, "MeetingController.reopenMeeting failed");
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
    const now = new Date();
    let duration: number | null = null;

    if (meeting.start_time) {
      duration = Math.max(0, Math.round((now.getTime() - new Date(meeting.start_time).getTime()) / 60000));
    }

    const updated_meeting = await MeetingService.update(meeting._id, {
      end_time: now,
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
    req.log.error({ err }, "MeetingController.updateEndTime failed");
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}
