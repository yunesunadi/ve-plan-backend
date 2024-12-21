const AttendeeModel = require("../models/Attendee");

export function create(reqObj: any) {
  return AttendeeModel.create(reqObj);
}

export function findByEmail(email: string) {
  return AttendeeModel.findOne({ email });
}

export function findById(_id: string) {
  return AttendeeModel.findById({ _id });
}