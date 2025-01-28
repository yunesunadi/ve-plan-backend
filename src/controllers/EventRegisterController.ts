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