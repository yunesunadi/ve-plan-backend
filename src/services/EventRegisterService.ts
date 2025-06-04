import { objectId } from "../helpers/utils";

const EventRegisterModel = require("../models/EventRegister");

export function register(reqObj: any) {
  return EventRegisterModel.create(reqObj);
}

export function unregister(reqObj: any) {
  return EventRegisterModel.deleteOne(reqObj);
}

export function getHasRegistered(event_id: string, user_id: string) {
  const event = objectId(event_id);
  const user = objectId(user_id);
  return EventRegisterModel.findOne({ event, user });
}

export function getAllByEventId(id: string, query?: any) {
  const event = objectId(id);
  let result;
  
  if (Object.entries(query).length > 0) {
    if (query.limit) {
      result = EventRegisterModel.find({ event }).populate("user", "-password").populate("event").limit(query.limit);
    }
  
    if (query.offset) {
      result = EventRegisterModel.find({ event }).populate("user", "-password").populate("event").skip(query.offset).limit(query.limit);
    }
  } else {
    result = EventRegisterModel.find({ event }).populate("user", "-password").populate("event");
  }

  return result;
}

export function getAllApprovedByEventId(id: string) {
  const event = objectId(id);
  return EventRegisterModel.find({ event, register_approved: true }).populate("user", "-password").populate("event");
}

export function getAllByUserId(user_id: string) {
  const user = objectId(user_id);
  return EventRegisterModel.find({ user, register_approved: false }).populate("user", "-password").populate("event");
}

export function getAllApprovedByUserId(user_id: string) {
  const user = objectId(user_id);
  return EventRegisterModel.find({ user, register_approved: true }).populate("user", "-password").populate("event");
}

export function approveRegister(user_id: string, event_id: string) {
  const user = objectId(user_id);
  const event = objectId(event_id);
  return EventRegisterModel.findOneAndUpdate({ user, event }, { register_approved: true }, { new: true });
}

export function startMeeting(user_id: string, event_id: string) {
  const user = objectId(user_id);
  const event = objectId(event_id);
  return EventRegisterModel.findOneAndUpdate({ user, event }, { meeting_started: true }, { new: true });
}
