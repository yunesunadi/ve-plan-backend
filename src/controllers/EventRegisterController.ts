import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const EventRegisterService = require("../services/EventRegisterService");

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
    const registered_users = await EventRegisterService.getAllByEventId(req.params.id);

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
    const register_approved = await EventRegisterService.approveRegister(req.body.user_id, req.body.event_id);

    if (!register_approved) {
      return res.status(500).json({
        status: "success",
        message: "Failed to approve registration.",
      });
    }

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
    const meeting_started = await EventRegisterService.startMeeting(req.body.user_id, req.body.event_id);

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
