import { objectId } from "../helpers/utils";

const EventModel = require("../models/Event");

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
  return EventModel.find({ _id }).populate("user");
}

export function update(id: string, event: any) {
  const _id = objectId(id);
  return EventModel.findOneAndUpdate({ _id }, event);
}