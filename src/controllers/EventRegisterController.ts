import { Request, Response } from "express";
import { isRequestInvalid, isEventExpired } from "../helpers/utils";
import * as EventRegisterService from "../services/EventRegisterService";
import * as EmailService from "../services/EmailService";
import * as NotificationService from "../services/NotificationService";
import * as EventService from "../services/EventService";
import * as UserService from "../services/UserService";

export async function register(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const event = await EventService.getOneById(req.body.event_id);

    if (!event) {
      return res.status(404).json({
        status: "error",
        message: "Event not found.",
      });
    }

    if (isEventExpired(event.date, event.end_time)) {
      return res.status(400).json({
        status: "error",
        message: "This event has already ended and can no longer be registered for.",
      });
    }

    const register = await EventRegisterService.register({
      event: req.body.event_id,
      user: req.user._id
    });

    if (!register) {
      return res.status(500).json({
        status: "error",
        message: "Error registering event.",
      });
    } 

    return res.status(201).json({
      status: "success",
      message: "Register event successfully.",
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

export async function unregister(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const register = await EventRegisterService.unregister({
      event: req.params.id,
      user: req.user._id
    });

    if (!register) {
      return res.status(500).json({
        status: "error",
        message: "Error unregistering event.",
      });
    } 

    return res.status(200).json({
      status: "success",
      message: "Unegister event successfully.",
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

export async function hasRegistered(req: any, res: Response) {
  try {
    const registered_event = await EventRegisterService.getHasRegistered(req.params.id, req.user._id);

    if (!registered_event) {
      return res.status(200).json({
        status: "success",
        message: "This event hasn't been registered.",
        has_registered: false,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "This event has been registered.",
      has_registered: true,
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
export async function isRegisterApproved(req: any, res: Response) {
  try {
    const registered_event = await EventRegisterService.getHasRegistered(req.params.id, req.user._id);

    if (!registered_event || !registered_event.register_approved) {
      return res.status(200).json({
        status: "success",
        message: "This event hasn't been register-approved.",
        is_register_approved: false,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "This event has been register-approved.",
      is_register_approved: true,
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
    const registered_users = await EventRegisterService.getAllByEventId(req.params.id as string, req.query);

    return res.status(200).json({
      status: "success",
      message: "Fetch registered users successfully.",
      data: registered_users
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

export async function getAllApprovedByEventId(req: Request, res: Response) {
  try {
    const approved_users = await EventRegisterService.getAllApprovedByEventId(req.params.id as string);

    return res.status(200).json({
      status: "success",
      message: "Fetch register approved users successfully.",
      data: approved_users
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
    const registered_events = await EventRegisterService.getAllByUserId(req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Fetch registered events successfully.",
      data: registered_events
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

export async function getAllApprovedByUserId(req: any, res: Response) {
  try {
    const registered_events = await EventRegisterService.getAllApprovedByUserId(req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Fetch registered events successfully.",
      data: registered_events
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

export async function approveRegister(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const requested_user_ids = Array.isArray(req.body.user_id_list) ? req.body.user_id_list : [];
    const event = await EventService.getOneById(req.body.event_id);

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

    const pending = await EventRegisterService.getPendingByEventAndUsers(req.body.event_id, requested_user_ids);
    const user_id_list = pending.map((registration: any) => registration.user.toString());

    if (user_id_list.length < 1) {
      return res.status(200).json({
        status: "success",
        message: "No pending registrations to approve.",
      });
    }

    await Promise.all(user_id_list.map(async (user_id: string) => {
      const user = await UserService.findById(user_id);

      await EmailService.send({
        action: "register_approved",
        recipient: user.email,
        additional: {
          name: user.name,
          event_title: event.title,
        }
      });
    }));

    const register_approved = await EventRegisterService.approveRegister(user_id_list, req.body.event_id);

    if (!register_approved) {
      return res.status(500).json({
        status: "error",
        message: "Failed to approve registration.",
      });
    }

    await NotificationService.sendRegistrationApproved(user_id_list, event.title);

    return res.status(200).json({
      status: "success",
      message: "Registration has been successfully approved.",
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

    const meeting_started = await EventRegisterService.startMeeting(user_id_list, event_id);

    if (!meeting_started) {
      return res.status(500).json({
        status: "error",
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
