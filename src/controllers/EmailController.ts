import { Request, Response } from "express";
const EmailService = require("../services/EmailService");

export async function send(req: any, res: Response) {
  try {
    await EmailService.send({
      action: req.body.action,
      recipient: req.body.recipient,
      additional: {
        name: req.body.name,
        event_title: req.body.event_title,
      }
    });

    return res.status(200).json({
      status: "success",
      message: "Send email successfully.",
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