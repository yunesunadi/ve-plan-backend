import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const NotificationService = require("../services/NotificationService");

export async function getUserNotifications(req: any, res: Response) {
  try {
    const notifications = await NotificationService.getUserNotifications(req.user._id);

    return res.status(200).json({
      status: "success",
      data: notifications
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

export async function markAsRead(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const { notification_id_list } = req.body;
    
    await NotificationService.markAsRead(notification_id_list, req.user._id);
    
    return res.status(200).json({
      status: "success",
      message: "Marked notifications as read."
    });
  } catch (err) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function getUnreadCount(req: any, res: Response) {
  try {
    const count = await NotificationService.getUnreadCount(req.user._id);

    return res.status(200).json({
      status: "success",
      unreadCount: count
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function deleteNotifications(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const notification_id_list = JSON.parse(req.query.notification_id_list);

    await NotificationService.deleteNotification(notification_id_list, req.user._id);
    
    return res.status(200).json({
      status: "success",
      message: "Deleted notifications successfully."
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}
