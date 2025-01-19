import mongoose from "mongoose";

const EventModel = require("../models/Event");

export function create(reqObj: any) {
  return EventModel.create(reqObj);
}