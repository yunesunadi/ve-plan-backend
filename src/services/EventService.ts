const EventModel = require("../models/Event");

export function create(reqObj: any) {
  return EventModel.create(reqObj);
}

export function getAll() {
  return EventModel.find({});
}