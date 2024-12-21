const OrganizerModel = require("../models/Organizer");

export function create(reqObj: any) {
  return OrganizerModel.create(reqObj);
}

export function findByEmail(email: string) {
  return OrganizerModel.findOne({ email });
}

export function findById(_id: string) {
  return OrganizerModel.findById({ _id });
}