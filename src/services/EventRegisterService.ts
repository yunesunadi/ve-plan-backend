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

export function getAll(id: string) {
  const event = objectId(id);
  return EventRegisterModel.find({ event }).populate("user");
}