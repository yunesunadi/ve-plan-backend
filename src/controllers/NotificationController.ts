import { Response } from "express";
import mongoose from "mongoose";
import * as NotificationService from "../services/NotificationService";

const MAX_IDS = 200;

function readIdList(req: any, res: Response): string[] | null {
  let raw = req.body?.notification_id_list;

  if (raw === undefined && typeof req.query.notification_id_list === "string") {
    try {
      raw = JSON.parse(req.query.notification_id_list);
    } catch {
      res.status(400).json({ status: "error", message: "notification_id_list must be a JSON array of ids." });
      return null;
    }
  }

  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_IDS) {
    res.status(400).json({
      status: "error",
      message: `notification_id_list must be a non-empty array of at most ${MAX_IDS} ids.`
    });
    return null;
  }

  if (!raw.every((id) => mongoose.isValidObjectId(id))) {
    res.status(400).json({ status: "error", message: "notification_id_list contains an invalid id." });
    return null;
  }

  return raw;
}

export async function getUserNotifications(req: any, res: Response) {
  try {
    const offset = parseInt(req.query.offset, 10);
    const limit = parseInt(req.query.limit, 10);

    const { items, total, unread, ...page } = await NotificationService.getUserNotifications(
      req.user._id,
      {
        offset: Number.isNaN(offset) ? undefined : offset,
        limit: Number.isNaN(limit) ? undefined : limit,
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Fetch notifications successfully.",
      data: items,
      meta: { total, unread, offset: page.offset, limit: page.limit }
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function markAsRead(req: any, res: Response) {
  try {
    const ids = readIdList(req, res);
    if (!ids) return;

    const result = await NotificationService.markAsRead(ids, req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Marked notifications as read.",
      data: { updated: result.modifiedCount ?? 0 }
    });
  } catch (err) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function markAllAsRead(req: any, res: Response) {
  try {
    const result = await NotificationService.markAllAsRead(req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Marked all notifications as read.",
      data: { updated: result.modifiedCount ?? 0 }
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
    const ids = readIdList(req, res);
    if (!ids) return;

    const result = await NotificationService.deleteNotification(ids, req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Deleted notifications successfully.",
      data: { deleted: result.deletedCount ?? 0 }
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}
