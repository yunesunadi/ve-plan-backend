import { objectId } from "../helpers/utils";

const EventInviteModel = require("../models/EventInvite");

export function invite(reqObj: any) {
  return EventInviteModel.create(reqObj);
}

export function getAllByEventId(id: string) {
  const event = objectId(id);
  return EventInviteModel.find({ event }).populate("user", "-password").populate("event");
}

export function getAllAcceptedByEventId(id: string) {
  const event = objectId(id);
  return EventInviteModel.find({ event, invitation_accepted: true }).populate("user", "-password").populate("event");
}

export function getAllByUserId(id: string) {
  const user = objectId(id);
  return EventInviteModel.find({ user, invitation_accepted: false }).populate("user", "-password").populate("event");
}

export function getAllAcceptedByUserId(id: string) {
  const user = objectId(id);
  return EventInviteModel.find({ user, invitation_accepted: true }).populate("user", "-password").populate("event");
}

export function acceptInvite(user_id: string, event_id: string) {
  const user = objectId(user_id);
  const event = objectId(event_id);
  return EventInviteModel.findOneAndUpdate({ user, event }, { invitation_accepted: true }, { new: true });
}

export function startMeeting(user_id: string, event_id: string) {
  const user = objectId(user_id);
  const event = objectId(event_id);
  return EventInviteModel.findOneAndUpdate({ user, event }, { meeting_started: true }, { new: true });
}
