import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
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

    await Promise.all(user_id_list.map(async (user_id: string) => {
      const user = await UserService.findById(user_id);

      await EmailService.send({
        action: "invitation_sent",
        recipient: user.email,
        additional: {
          name: user.name,
          event_title: event.title,
        }
      });
    }));

    const invite = await EventInviteService.invite(user_id_list, event_id);

    if (!invite) {
      return res.status(500).json({
        status: "error",
        message: "Error inviting event.",
      });
    }

    await NotificationService.sendInvitation(user_id_list, event.title);

    return res.status(201).json({
      status: "success",
      message: "Invite event successfully.",
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

export async function getAllByEventId(req: Request, res: Response) {
  try {
    const invited_users = await EventInviteService.getAllByEventId(req.params.id);

    return res.status(200).json({
      status: "success",
      message: "Fetch invited users successfully.",
      data: invited_users
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

export async function getAllAcceptedByEventId(req: Request, res: Response) {
  try {
    const invite_accepted_users = await EventInviteService.getAllAcceptedByEventId(req.params.id);

    return res.status(200).json({
      status: "success",
      message: "Fetch invitation accepted users successfully.",
      data: invite_accepted_users
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

export async function getAllByUserId(req: any, res: Response) {
  try {
    const invited_events = await EventInviteService.getAllByUserId(req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Fetch invited events successfully.",
      data: invited_events
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

export async function getAllAcceptedByUserId(req: any, res: Response) {
  try {
    const invite_accepted_events = await EventInviteService.getAllAcceptedByUserId(req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Fetch invitation accepted events successfully.",
      data: invite_accepted_events
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

export async function acceptInvite(req: any, res: Response) {
  try {
    const invite_accepted = await EventInviteService.acceptInvite(req.user._id, req.body.event_id);

    if (!invite_accepted) {
      return res.status(500).json({
        status: "success",
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
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function startMeeting(req: any, res: Response) {
  try {
    const user_id_list = req.body.user_id_list;
    const event_id = req.body.event_id;
    const event = await EventService.getOneById(event_id);
    
    await Promise.all(user_id_list.map(async (user_id: string) => {
      const user = await UserService.findById(user_id);

      await EmailService.send({
        action: "meeting_started",
        recipient: user.email,
        additional: {
          name: user.name,
          event_title: event.title,
        }
      });
    }));

    const meeting_started = await EventInviteService.startMeeting(user_id_list, event_id);

    if (!meeting_started) {
      return res.status(500).json({
        status: "success",
        message: "Failed to send meeting email.",
      });
    }

    await NotificationService.sendMeetingStarted(user_id_list, event.title);

    return res.status(200).json({
      status: "success",
      message: "Meeting email has been successfully sent.",
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