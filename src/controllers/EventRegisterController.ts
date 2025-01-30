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

export async function getAll(req: Request, res: Response) {
  try {
    const registered_users = await EventRegisterService.getAll(req.params.id);

    if (registered_users.length < 1) {
      return res.status(200).json({
        status: "error",
        message: "There is no registered user in this event."
      });
    }

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

export async function approveRegister(req: any, res: Response) {
  try {
    const register_approved = await EventRegisterService.approveRegister(req.body.user_id, req.body.event_id);

    if (!register_approved) {
      return res.status(500).json({
        status: "success",
        message: "Failed to approve registration.",
        has_registered: false,
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