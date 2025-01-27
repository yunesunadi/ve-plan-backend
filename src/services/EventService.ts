import { objectId } from "../helpers/utils";

const EventModel = require("../models/Event");
const EventRegisterModel = require("../models/EventRegister");

export function create(reqObj: any) {
  return EventModel.create(reqObj);
}

export function getAll(id: string) {
  const user = objectId(id);
  return EventModel.find({ 
    $or: [
      { user },
      { type: "public" }
    ]
  });
}

export function getOneById(id: string) {
  const _id = objectId(id);
  return EventModel.findOne({ _id }).populate("user");
}

export function update(id: string, event: any) {
  const _id = objectId(id);
  return EventModel.findOneAndUpdate({ _id }, event);
}

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