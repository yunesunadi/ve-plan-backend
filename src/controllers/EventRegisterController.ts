import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import * as EventRegisterService from "../services/EventRegisterService";
import * as EmailService from "../services/EmailService";
import * as NotificationService from "../services/NotificationService";
import * as EventService from "../services/EventService";
import * as UserService from "../services/UserService";

export async function register(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

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

    if (!registered_event) {
      return res.status(500).json({
        status: "success",
        message: "This event hasn't been registered.",
      });
    }

    if (!registered_event.register_approved) {
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
    const registered_users = await EventRegisterService.getAllByEventId(req.params.id, req.query);

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
    const approved_users = await EventRegisterService.getAllApprovedByEventId(req.params.id);

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
    const user_id_list = req.body.user_id_list;
    const event = await EventService.getOneById(req.body.event_id);
    
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
        status: "success",
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

    const meeting_started = await EventRegisterService.startMeeting(user_id_list, event_id);

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
