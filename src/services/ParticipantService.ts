import { objectId } from "../helpers/utils";

const ParticipantModel = require("../models/Participant");

export function getOne(event_id: string, user_id: string) {
  const event = objectId(event_id);
  const user = objectId(user_id);
  return ParticipantModel.findOne({ event, user });
}

export function create(reqObj: any) {
  return ParticipantModel.create(reqObj);
}

export function update(id: string, participant: any) {
  return ParticipantModel.findByIdAndUpdate(objectId(id), participant, { new: true });
}

export function getAll(event_id: string) {
  const event = objectId(event_id);
  return ParticipantModel.find({ event }).populate("user", "-password");
}

export function getAllWithNoEndTime(event_id: string) {
  const event = objectId(event_id);
  return ParticipantModel.find({ event, end_time: null }).populate("user", "-password");
}
