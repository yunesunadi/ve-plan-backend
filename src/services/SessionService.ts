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
  const _id = objectId(id);
  return SessionModel.findOne({ _id });
}

export function update(id: string, session: any) {
  const _id = objectId(id);
  return SessionModel.findOneAndUpdate({ _id }, session);
}