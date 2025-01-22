const EventModel = require("../models/Event");

export function create(reqObj: any) {
  return EventModel.create(reqObj);
}

export function getAll(organizer_id: string) {
  return EventModel.find({ 
    $or: [
      { organizer_id },
      { type: "public" }
    ]
  });
}

export function getOneById(id: string) {
  return EventModel.find({ _id: id });
}