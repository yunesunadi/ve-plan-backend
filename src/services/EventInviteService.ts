import { objectId } from "../helpers/utils";

const EventInviteModel = require("../models/EventInvite");

export function invite(reqObj: any) {
  return EventInviteModel.create(reqObj);
}

export function getAll(id: string) {
  const event = objectId(id);
  return EventInviteModel.find({ event }).populate("user").populate("event");
}

export function getAllAccepted(id: string) {
  const event = objectId(id);
  return EventInviteModel.find({ event, invitation_accepted: true }).populate("user").populate("event");
}

export function acceptInvite(user_id: string, event_id: string) {
  const user = objectId(user_id);
  const event = objectId(event_id);
  return EventInviteModel.findOneAndUpdate({ user, event }, { invitation_accepted: true });
}