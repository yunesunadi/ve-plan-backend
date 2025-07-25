import { objectId } from "../helpers/utils";

const EventRegisterModel = require("../models/EventRegister");

const omitted_user_fields = "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -googleId -facebookId";

export function register(reqObj: any) {
  return EventRegisterModel.create(reqObj);
}

export function unregister(reqObj: any) {
  return EventRegisterModel.deleteOne(reqObj);
}

export function getHasRegistered(event_id: string, user_id: string) {
  const event = objectId(event_id);
  const user = objectId(user_id);
  return EventRegisterModel.findOne({ event, user }).populate("user", omitted_user_fields).populate("event");
}

export function getAllByEventId(id: string, query?: any) {
  const event = objectId(id);
  let result = EventRegisterModel.find({ event }).populate("user", omitted_user_fields).populate("event");
  
  if (Object.entries(query).length > 0) {
    if (query.offset) {
      result = result.skip(query.offset);
    }
    
    if (query.limit) {
      result = result.limit(query.limit);
    }
  }

  return result;
}

export function getAllApprovedByEventId(id: string) {
  const event = objectId(id);
  return EventRegisterModel.find({ event, register_approved: true }).populate("user", omitted_user_fields).populate("event");
}

export function getAllByUserId(user_id: string) {
  const user = objectId(user_id);
  return EventRegisterModel.find({ user, register_approved: false }).populate("user", omitted_user_fields).populate("event");
}

export function getAllApprovedByUserId(user_id: string) {
  const user = objectId(user_id);
  return EventRegisterModel.find({ user, register_approved: true }).populate("user", omitted_user_fields).populate("event");
}

export function approveRegister(user_id_list: string[], event_id: string) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  return EventRegisterModel.updateMany({ user: { $in: user_id_list_object }, event }, { register_approved: true }, { new: true });
}

export function startMeeting(user_id_list: string[], event_id: string) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  return EventRegisterModel.updateMany({ user: { $in: user_id_list_object }, event }, { meeting_started: true }, { new: true });
}
