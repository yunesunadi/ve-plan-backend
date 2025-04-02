import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const EventInviteService = require("../services/EventInviteService");

export async function invite(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const existing = await EventInviteService.getOneByEventAndUserId(req.body.event_id, req.body.user_id);

    if (existing) {
      return res.status(500).json({
        status: "error",
        message: "Already invited this user.",
      });
    }

    const invite = await EventInviteService.invite({
      event: req.body.event_id,
      user: req.body.user_id
    });

    if (!invite) {
      return res.status(500).json({
        status: "error",
        message: "Error inviting event.",
      });
    } 

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
    const meeting_started = await EventInviteService.startMeeting(req.body.user_id, req.body.event_id);

    if (!meeting_started) {
      return res.status(500).json({
        status: "success",
        message: "Failed to send meeting email.",
      });
    }

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