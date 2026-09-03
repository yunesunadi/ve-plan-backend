import { Request, Response } from "express";
import { isRequestInvalid, isEventExpired, bestEffort } from "../helpers/utils";
import { pageMeta } from "../helpers/paging";
import * as EventInviteService from "../services/EventInviteService";
import * as EmailService from "../services/EmailService";
import * as NotificationService from "../services/NotificationService";
import * as UserService from "../services/UserService";
import * as EventService from "../services/EventService";

export async function invite(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const user_id_list = req.body.user_id_list;
    const event_id = req.body.event_id;
    const event = await EventService.getOneById(event_id);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "Event not found.",
      });
    }

    if (event.user._id.toString() !== req.user._id) {
      return res.status(403).json({
        status: "error",
        message: "You are not the organizer of this event.",
      });
    }

    if (isEventExpired(event)) {
      return res.status(400).json({
        status: "error",
        message: "This event has already ended and can no longer be invited to.",
      });
    }

    const existing = await EventInviteService.getOneByEventAndUserId(event_id, user_id_list);

    const already_invited_users = await Promise.all(existing.map(async (item: any) => {
      return await UserService.findById(item.user);
    }));

    if (already_invited_users.length > 0) {
      return res.status(409).json({
        status: "error",
        message: `Already invited users: ${already_invited_users.map((item: any) => item.name).join(", ")}`,
      });
    }

    const invite = await EventInviteService.invite(user_id_list, event_id);

    if (!invite) {
      return res.status(500).json({
        status: "error",
        message: "Error inviting event.",
      });
    }

    await bestEffort("invitation_sent emails", async () => {
      const users = await UserService.findManyByIds(user_id_list);
      await EmailService.sendBatch(users.map((user: any) => ({
        action: "invitation_sent",
        recipient: user.email,
        additional: { name: user.name, event_title: event.title },
      })));
    });

    await bestEffort("invitation notifications", () => NotificationService.sendInvitation(user_id_list, event));

    return res.status(201).json({
      status: "success",
      message: "Invite event successfully.",
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function getAllByEventId(req: Request, res: Response) {
  try {
    const invited_users = await EventInviteService.getAllByEventId(req.params.id as string);

    return res.status(200).json({
      status: "success",
      message: "Fetch invited users successfully.",
      data: invited_users
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getAllAcceptedByEventId(req: Request, res: Response) {
  try {
    const invite_accepted_users = await EventInviteService.getAllAcceptedByEventId(req.params.id as string);

    return res.status(200).json({
      status: "success",
      message: "Fetch invitation accepted users successfully.",
      data: invite_accepted_users
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getAllByUserId(req: any, res: Response) {
  try {
    const { items, total, offset, limit } = await EventInviteService.getAllByUserId(req.user._id, req.query);

    return res.status(200).json({
      status: "success",
      message: "Fetch invited events successfully.",
      data: items,
      meta: pageMeta(total, offset, limit)
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function getAllAcceptedByUserId(req: any, res: Response) {
  try {
    const { items, total, offset, limit } = await EventInviteService.getAllAcceptedByUserId(req.user._id, req.query);

    return res.status(200).json({
      status: "success",
      message: "Fetch invitation accepted events successfully.",
      data: items,
      meta: pageMeta(total, offset, limit)
    });
  } catch (err: any) {
     console.log("err", err);
     return res.status(500).json({
       status: "error",
       message: "Something went wrong."
     });
   }
}

export async function acceptInvite(req: any, res: Response) {
  try {
    const invite_accepted = await EventInviteService.acceptInvite(req.user._id, req.body.event_id);

    if (!invite_accepted) {
      return res.status(500).json({
        status: "error",
        message: "Failed to accept invitation.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Invitation has been successfully accepted.",
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function startMeeting(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const user_id_list = req.body.user_id_list;
    const event_id = req.body.event_id;
    const event = await EventService.getOneById(event_id);

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

    const meeting_started = await EventInviteService.startMeeting(user_id_list, event_id);

    if (!meeting_started) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send meeting email.",
      });
    }

    await bestEffort("meeting_started emails", async () => {
      const users = await UserService.findManyByIds(user_id_list);
      await EmailService.sendBatch(users.map((user: any) => ({
        action: "meeting_started",
        recipient: user.email,
        additional: { name: user.name, event_title: event.title },
      })));
    });

    await bestEffort("meeting_started notifications", () => NotificationService.sendMeetingStarted(user_id_list, event));

    return res.status(200).json({
      status: "success",
      message: "Meeting email has been successfully sent.",
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}