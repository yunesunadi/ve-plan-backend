import { objectId } from "../helpers/utils";
import { logger } from "../helpers/logger";
import * as SocketService from "../libs/socket";
const NotificationModel = require("../models/Notification");
import * as UserService from "./UserService";

const FANOUT_CHUNK = 500;

interface CreateNotificationData {
  recipient: string;
  sender?: string;
  type: string;
  title: string;
  message: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const createNotification = async (notificationData: CreateNotificationData) => {
  try {
    const notification = await NotificationModel.create(notificationData);
    SocketService.sendToUser(notificationData.recipient, "notification", notification);
    return notification;
  } catch (error) {
    logger.error({ err: error }, "failed to create notification");
    return null;
  }
};

async function fanOut(
  recipient_ids: string[],
  row: (recipient: string) => CreateNotificationData
) {
  try {
    for (const group of chunk(recipient_ids, FANOUT_CHUNK)) {
      const notifications = await NotificationModel.insertMany(group.map(row));
      notifications.forEach((n: any) =>
        SocketService.sendToUser(n.recipient, "notification", n)
      );
    }
  } catch (error) {
    logger.error({ err: error }, "failed to create notifications");
  }
}

export const sendRegistrationWelcome = async (user: any) => {
  let message = "";
  if (user.role === "organizer") {
    message = `Hi ${user.name}, welcome to VE-Plan! You can start by creating a new event.`;
  }
  if (user.role === "attendee") {
    message = `Hi ${user.name}, welcome to VE-Plan! You can start by joining an existing event.`;
  }
  return createNotification({
    recipient: user._id,
    type: "first_time_register",
    title: "Welcome to VE-Plan!",
    message
  });
};

export const sendEventCreated = async (event: any) => {
  const recipient_ids = await UserService.findAllVerifiedIds();
  await fanOut(recipient_ids, (recipient) => ({
    recipient,
    sender: event._id?.toString(),
    type: "event_created",
    title: "Event Created",
    message: `An event named "${event.title}" has been created. You can view it in the events list.`
  }));
};

export const sendEventUpdated = async (event: any) => {
  const recipient_ids = await UserService.findAllVerifiedIds();
  await fanOut(recipient_ids, (recipient) => ({
    recipient,
    sender: event._id?.toString(),
    type: "event_updated",
    title: "Event Updated",
    message: `An event named "${event.title}" has been updated. You can view it in the events list.`
  }));
};

export const sendEventChangedToParticipants = async (event: any, user_id_list: string[]) => {
  await fanOut(user_id_list, (recipient) => ({
    recipient,
    sender: event._id?.toString(),
    type: "event_updated",
    title: "Event Updated",
    message: `The event "${event.title}" you are attending has changed. Check its new date and time.`
  }));
};

export const sendRegistrationApproved = async (user_id_list: string[], event: any) => {
  await fanOut(user_id_list, (recipient) => ({
    recipient,
    sender: event._id?.toString(),
    type: "register_approved",
    title: "Registration Approved",
    message: `Your registration for the event "${event.title}" has been approved. You can view it in the joined events list.`
  }));
};

export const sendInvitation = async (user_id_list: string[], event: any) => {
  await fanOut(user_id_list, (recipient) => ({
    recipient,
    sender: event._id?.toString(),
    type: "event_invited",
    title: "Invitation",
    message: `You have been invited to the event "${event.title}". You can view it in the invitations list.`
  }));
};

export const sendAttendeeUnregistered = async (event: any, attendee: any) => {
  const organizerId = (event.user?._id ?? event.user)?.toString();
  if (!organizerId) return null;
  return createNotification({
    recipient: organizerId,
    sender: event._id?.toString(),
    type: "attendee_unregistered",
    title: "Attendee left",
    message: `${attendee.name} has unregistered from your event "${event.title}".`
  });
};

export const sendMeetingStarted = async (user_id_list: string[], event: any) => {
  await fanOut(user_id_list, (recipient) => ({
    recipient,
    sender: event._id?.toString(),
    type: "meeting_started",
    title: "Meeting Started",
    message: `The meeting for the event "${event.title}" has started. You can view it in the joined events list.`
  }));
};

export const sendMeetingEnded = async (user_id_list: string[], event: any) => {
  await fanOut(user_id_list, (recipient) => ({
    recipient,
    sender: event._id?.toString(),
    type: "meeting_ended",
    title: "Meeting Ended",
    message: `The meeting for the event "${event.title}" has ended.`
  }));
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const getUserNotifications = async (
  user_id: string,
  opts: { offset?: number; limit?: number } = {}
) => {
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? DEFAULT_LIMIT));

  const [items, total, unread] = await Promise.all([
    NotificationModel.find({ recipient: user_id })
      .populate("sender", "title date start_time end_time type")
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit),
    NotificationModel.countDocuments({ recipient: user_id }),
    NotificationModel.countDocuments({ recipient: user_id, isRead: false }),
  ]);

  return { items, total, unread, offset, limit };
};

export const markAsRead = (notification_id_list: string[], user_id: string) => {
  const ids = notification_id_list.map((id) => objectId(id));
  return NotificationModel.updateMany(
    { _id: { $in: ids }, recipient: user_id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

export const markAllAsRead = (user_id: string) => {
  return NotificationModel.updateMany(
    { recipient: user_id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

export const getUnreadCount = (user_id: string) => {
  return NotificationModel.countDocuments({ recipient: user_id, isRead: false });
};

export const deleteNotification = (notification_id_list: string[], user_id: string) => {
  const ids = notification_id_list.map((id) => objectId(id));
  return NotificationModel.deleteMany({ _id: { $in: ids }, recipient: user_id });
};
