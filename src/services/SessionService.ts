import { objectId } from "../helpers/utils";

const SessionModel = require("../models/Session");

export function create(reqObj: any) {
  return SessionModel.create(reqObj);
}

export function getAll(id: string) {
  const event = objectId(id);
  return SessionModel.find({ event });
}

export function getOneById(id: string) {
  return SessionModel.findById(objectId(id));
}

export function update(id: string, session: any) {
  return SessionModel.findByIdAndUpdate(objectId(id), session, { new: true });
}

export function deleteOne(id: string) {
  return SessionModel.findOneAndDelete(objectId(id));
}
