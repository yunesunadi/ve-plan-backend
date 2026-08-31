import { Response } from "express";
import { isRequestInvalid, joinWindowState } from "../helpers/utils";
import * as ParticipantService from "../services/ParticipantService";
import * as MeetingService from "../services/MeetingService";
import * as EventRegisterService from "../services/EventRegisterService";
import * as EventInviteService from "../services/EventInviteService";

export async function create(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const event_id = req.body.event;

    const [registered, invited, meeting] = await Promise.all([
      EventRegisterService.getHasRegistered(event_id, req.user._id),
      EventInviteService.getHasInvited(event_id, req.user._id),
      MeetingService.getOneByEventId(event_id),
    ]);

    const is_participant = Boolean(
      (registered && registered.register_approved) || (invited && invited.invitation_accepted)
    );

    if (!is_participant) {
      return res.status(403).json({
        status: "error",
        message: "You are not a participant of this event.",
      });
    }

    if (!meeting || meeting.ended) {
      return res.status(403).json({
        status: "error",
        message: "There is no live meeting for this event.",
      });
    }

    const join_window = joinWindowState(meeting.event);

    if (join_window.state === "closed") {
      return res.status(403).json({
        status: "error",
        message: "The join window for this event has closed.",
      });
    }

    if (join_window.state === "early") {
      return res.status(403).json({
        status: "error",
        message: `This meeting can be joined from ${new Date(join_window.opensAt).toISOString()}.`,
      });
    }

    if (!meeting.host_present) {
      return res.status(409).json({
        status: "error",
        message: "The host hasn't started this meeting yet.",
      });
    }

    const existing = await ParticipantService.getOne(event_id, req.user._id);
    const already_in = Boolean(existing && !existing.end_time);

    if (!already_in) {
      const present = await ParticipantService.countPresent(event_id);

      if (present >= (meeting.capacity || 25)) {
        return res.status(409).json({
          status: "error",
          message: "This meeting is full.",
        });
      }
    }

    if (existing) {
      await ParticipantService.update(existing._id, {
        room_name: meeting.room_name,
        start_time: new Date(),
        end_time: null,
      });

      return res.status(200).json({
        status: "success",
        message: "Rejoined meeting successfully.",
      });
    }

    const participant = await ParticipantService.create({
      event: event_id,
      user: req.user._id,
      room_name: meeting.room_name,
      start_time: new Date(),
    });

    if (!participant) {
      return res.status(500).json({
        status: "error",
        message: "Error creating participant.",
      });
    }

    return res.status(201).json({
      status: "success",
      message: "Create participant successfully.",
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

    const participant = await ParticipantService.getOne(req.params.id, req.user._id);

    if (!participant) {
      return res.status(404).json({
        status: "error",
        message: "You have no participant record for this event.",
      });
    }

    if (participant.end_time) {
      return res.status(200).json({
        status: "success",
        message: "Update participant successfully.",
      });
    }

    const now = new Date();
    const session_minutes = participant.start_time
      ? Math.max(0, Math.round((now.getTime() - new Date(participant.start_time).getTime()) / 60000))
      : 0;

    const updated_participant = await ParticipantService.update(participant._id, {
      end_time: now,
      duration: (participant.duration || 0) + session_minutes,
    });

    if (!updated_participant) {
      return res.status(500).json({
        status: "error",
        message: "Error updating participant.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Update participant successfully.",
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function updateNoEndTime(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const participants = await ParticipantService.getAllWithNoEndTime(req.params.id);

    if (participants.length < 1) {
      return res.status(200).json({
        status: "success",
        message: "No participants to update.",
        data: []
      });
    }

    const now = new Date();
    await Promise.all(participants.map((participant: any) => {
      const minute = participant.start_time
        ? Math.max(0, Math.round((now.getTime() - new Date(participant.start_time).getTime()) / 60000))
        : 0;
      return ParticipantService.update(participant._id, {
        end_time: now,
        duration: (participant.duration || 0) + minute
      });
    }));

    return res.status(200).json({
      status: "success",
      message: "Update participants successfully.",
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
    const participants = await ParticipantService.getAll(req.params.id);

    return res.status(200).json({
      status: "success",
      message: "Fetch participant successfully.",
      data: participants
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function getStayTimes(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const meeting = await MeetingService.getOneById(req.params.id, req.user._id);
    const participants = await ParticipantService.getAll(req.params.id);

    const durations = participants
      .map((participant: any) => participant.duration)
      .filter((duration: any) => typeof duration === "number" && duration >= 0);

    if (!meeting || !meeting.ended || durations.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "Stay-time analytics are not available yet.",
        data: [],
        meta: {
          available: false,
          reason: !meeting || !meeting.ended
            ? "Analytics will be available after the meeting ends."
            : "No participant stay times were recorded.",
        },
      });
    }

    const basis = meeting.duration && meeting.duration > 0
      ? meeting.duration
      : Math.max(...durations);
    const step = Math.max(1, Math.round(basis / 4));

    const buckets = [
      { label: `0 - ${step} min`, lo: 0, hi: step, value: 0 },
      { label: `${step} - ${step * 2} min`, lo: step, hi: step * 2, value: 0 },
      { label: `${step * 2} - ${step * 3} min`, lo: step * 2, hi: step * 3, value: 0 },
      { label: `${step * 3}+ min`, lo: step * 3, hi: Infinity, value: 0 },
    ];

    durations.forEach((duration: number) => {
      const bucket = buckets.find((b, index) =>
        index === 0 ? duration <= b.hi : duration > b.lo && duration <= b.hi
      );
      if (bucket) bucket.value += 1;
    });

    return res.status(200).json({
      status: "success",
      message: "Fetch stay times successfully.",
      data: buckets.map(({ label, value }) => ({ label, value })),
      meta: { available: true },
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}
