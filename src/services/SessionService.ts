import { objectId } from "../helpers/utils";

const SessionModel = require("../models/Session");

export function create(reqObj: any) {
  return SessionModel.create(reqObj);
}

export function getAll(id: string) {
  const event = objectId(id);
  return SessionModel.find({ event });
}
