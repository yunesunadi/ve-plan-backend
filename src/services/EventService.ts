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
  return EventModel.findById(objectId(id)).populate("user", "-password");
}

export function update(id: string, event: any) {
  return EventModel.findByIdAndUpdate(objectId(id), event, { new: true });
}
