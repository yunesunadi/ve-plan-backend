import { objectId } from "../helpers/utils";

const EventInviteModel = require("../models/EventInvite");

export function invite(user_id_list: string[], event_id: string) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  const list = user_id_list_object.map(user => ({ user, event }));
  return EventInviteModel.insertMany(list);
}

export function getOneByEventAndUserId(event_id: string, user_id_list: string[]) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  return EventInviteModel.find({ event, user: { $in: user_id_list_object } });
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

export function startMeeting(user_id_list: string[], event_id: string) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  return EventInviteModel.updateMany({ user: { $in: user_id_list_object }, event }, { meeting_started: true }, { new: true });
}

export function getHasInvited(event_id: string, user_id: string) {
  const event = objectId(event_id);
  const user = objectId(user_id);
  return EventInviteModel.findOne({ event, user });
}