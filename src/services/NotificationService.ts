import { objectId } from "../helpers/utils";
const SocketService = require("../libs/socket");
const NotificationModel = require("../models/Notification");
const UserService = require("./UserService");

interface CreateNotificationData {
  recipient: string;
  sender?: string;
  type: string;
  title: string;
  message: string;
}

export const createNotification = async (notificationData: CreateNotificationData) => {
  try {
    const notification = await NotificationModel.create(notificationData);
    SocketService.sendToUser(notificationData.recipient, "notification", notification);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
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

  return await createNotification({
    recipient: user._id,
    type: "first_time_register",
    title: "Welcome to VE-Plan!",
    message
  });
}

export const sendEventCreated = async (event: any) => {
  const recipients = await UserService.findAllVerified();

  try {
    const notifications = await NotificationModel.insertMany(
      recipients.map((recipient: any) => ({
        recipient: recipient._id,
        type: "event_created",
        title: "Event Created",
        message: `An event named "${event.title}" has been created. You can view it in the events list.`
      }))
    );

    notifications.forEach((notification: any) => {
      SocketService.sendToUser(notification.recipient, "notification", notification);
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export const sendRegistrationApproved = async (user_id_list: string[], event_title: string) => {
  try {
    const notifications = await NotificationModel.insertMany(
      user_id_list.map((user_id: string) => ({
        recipient: user_id,
        type: "register_approved",
        title: "Registration Approved",
        message: `Your registration for the event "${event_title}" has been approved. You can view it in the joined events list.`
      }))
    );

    notifications.forEach((notification: any) => {
      SocketService.sendToUser(notification.recipient, "notification", notification);
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export const sendInvitation = async (user_id_list: string[], event_title: string) => {
  try {
    const notifications = await NotificationModel.insertMany(
      user_id_list.map((user_id: string) => ({
        recipient: user_id,
        type: "event_invited",
        title: "Invitation",
        message: `You have been invited to the event "${event_title}". You can view it in the invitations list.`
      }))
    );

    notifications.forEach((notification: any) => {
      SocketService.sendToUser(notification.recipient, "notification", notification);
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export const sendMeetingStarted = async (user_id_list: string[], event_title: string) => {
  try {
    const notifications = await NotificationModel.insertMany(
      user_id_list.map((user_id: string) => ({
        recipient: user_id,
        type: "meeting_started",
        title: "Meeting Started",
        message: `The meeting for the event "${event_title}" has started. You can view it in the joined events list.`
      }))
    );

    notifications.forEach((notification: any) => {
      SocketService.sendToUser(notification.recipient, "notification", notification);
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export const sendEventUpdated = async (event: any) => {
  const recipients = await UserService.findAllVerified();

  try {
    const notifications = await NotificationModel.insertMany(
      recipients.map((recipient: any) => ({
        recipient: recipient._id,
        type: "event_updated",
        title: "Event Updated",
        message: `An event named "${event.title}" has been updated. You can view it in the events list.`
      }))
    );

    notifications.forEach((notification: any) => {
      SocketService.sendToUser(notification.recipient, "notification", notification);
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export const getUserNotifications = (user_id: string) => {
  return NotificationModel.find({ recipient: user_id }).sort({ createdAt: -1 });
}

export const markAsRead = (notification_id_list: string[], user_id: string) => {
  const notification_id_list_object = notification_id_list.map((notification_id: string) => objectId(notification_id));
  return NotificationModel.updateMany(
    { _id: { $in: notification_id_list_object }, recipient: user_id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
}

export const getUnreadCount = (user_id: string) => {
  return NotificationModel.countDocuments({
    recipient: user_id,
    isRead: false
  });
}

export const deleteNotification = (notification_id_list: string[], user_id: string) => {
  const notification_id_list_object = notification_id_list.map((notification_id: string) => objectId(notification_id));
  return NotificationModel.deleteMany({
    _id: { $in: notification_id_list_object },
    recipient: user_id
  });
}
