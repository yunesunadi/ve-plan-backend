import mongoose from "mongoose";
import { objectId } from "../helpers/utils";
import { parsePaging } from "../helpers/paging";

const EventRegisterModel = require("../models/EventRegister");

const omitted_user_fields = "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -googleId -facebookId";

export function register(reqObj: any) {
  const event = objectId(reqObj.event);
  const user = objectId(reqObj.user);
  return EventRegisterModel.findOneAndUpdate(
    { event, user },
    { $setOnInsert: { event, user, register_approved: false, meeting_started: false } },
    { upsert: true, new: true }
  );
}

export function unregister(reqObj: any) {
  return EventRegisterModel.deleteOne(reqObj);
}

export function getHasRegistered(event_id: string, user_id: string) {
  const event = objectId(event_id);
  const user = objectId(user_id);
  return EventRegisterModel.findOne({ event, user }).populate("user", omitted_user_fields).populate("event");
}

export async function getAllByEventId(id: string, query: any = {}) {
  const event = objectId(id);
  const { offset, limit } = parsePaging(query, { defaultLimit: 10 });

  const [items, total] = await Promise.all([
    EventRegisterModel.find({ event })
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .populate("user", omitted_user_fields)
      .populate("event"),
    EventRegisterModel.countDocuments({ event }),
  ]);

  return { items, total, offset, limit };
}

export function getAllApprovedByEventId(id: string) {
  const event = objectId(id);
  return EventRegisterModel.find({ event, register_approved: true }).populate("user", omitted_user_fields).populate("event");
}

export function getAllByUserId(user_id: string, query: any = {}) {
  return getPagedByUser({ user: objectId(user_id), register_approved: false }, query);
}

export function getAllApprovedByUserId(user_id: string, query: any = {}) {
  return getPagedByUser({ user: objectId(user_id), register_approved: true }, query);
}

async function getPagedByUser(base: any, query: any) {
  const { offset, limit } = parsePaging(query, { defaultLimit: 20 });

  const [page, total] = await Promise.all([
    EventRegisterModel.find(base)
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .populate("user", omitted_user_fields)
      .populate("event"),
    EventRegisterModel.countDocuments(base),
  ]);

  return { items: page.filter((r: any) => r.event), total, offset, limit };
}

export function getPendingByEventAndUsers(event_id: string, user_id_list: string[]) {
  const event = objectId(event_id);
  const users = user_id_list
    .filter((user_id: string) => mongoose.isValidObjectId(user_id))
    .map((user_id: string) => objectId(user_id));
  return EventRegisterModel.find({ event, user: { $in: users }, register_approved: false });
}

export function approveRegister(user_id_list: string[], event_id: string) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  return EventRegisterModel.updateMany({ user: { $in: user_id_list_object }, event }, { register_approved: true }, { new: true });
}

export async function getEventUserIds(event: any): Promise<string[]> {
  const rows = await EventRegisterModel.find({ event }).select("user").lean();
  return rows.map((r: any) => r.user.toString());
}

export function getAllMeetingStartedByEventId(event_id: string) {
  const event = objectId(event_id);
  return EventRegisterModel.find({ event, meeting_started: true }).populate("user", omitted_user_fields).populate("event");
}

export function startMeeting(user_id_list: string[], event_id: string) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  return EventRegisterModel.updateMany({ user: { $in: user_id_list_object }, event }, { meeting_started: true }, { new: true });
}
