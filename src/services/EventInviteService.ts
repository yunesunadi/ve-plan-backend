import { objectId } from "../helpers/utils";
import { parsePaging } from "../helpers/paging";

const EventInviteModel = require("../models/EventInvite");

const omitted_user_fields = "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -googleId -facebookId";

export function invite(user_id_list: string[], event_id: string) {
  const event = objectId(event_id);
  const operations = user_id_list.map((user_id: string) => {
    const user = objectId(user_id);
    return {
      updateOne: {
        filter: { event, user },
        update: {
          $setOnInsert: {
            event,
            user,
            invitation_sent: true,
            invitation_accepted: false,
            meeting_started: false,
          },
        },
        upsert: true,
      },
    };
  });
  return EventInviteModel.bulkWrite(operations);
}

export function getOneByEventAndUserId(event_id: string, user_id_list: string[]) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  return EventInviteModel.find({ event, user: { $in: user_id_list_object } }).populate("user", omitted_user_fields).populate("event");
}

export function getAllByEventId(id: string) {
  const event = objectId(id);
  return EventInviteModel.find({ event }).populate("user", omitted_user_fields).populate("event");
}

export function getAllAcceptedByEventId(id: string) {
  const event = objectId(id);
  return EventInviteModel.find({ event, invitation_accepted: true }).populate("user", omitted_user_fields).populate("event");
}

export function getAllByUserId(id: string, query: any = {}) {
  return getPagedByUser({ user: objectId(id), invitation_accepted: false }, query);
}

export function getAllAcceptedByUserId(id: string, query: any = {}) {
  return getPagedByUser({ user: objectId(id), invitation_accepted: true }, query);
}

async function getPagedByUser(base: any, query: any) {
  const { offset, limit } = parsePaging(query, { defaultLimit: 20 });

  const [page, total] = await Promise.all([
    EventInviteModel.find(base)
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .populate("user", omitted_user_fields)
      .populate("event"),
    EventInviteModel.countDocuments(base),
  ]);

  return { items: page.filter((r: any) => r.event), total, offset, limit };
}

export function acceptInvite(user_id: string, event_id: string) {
  const user = objectId(user_id);
  const event = objectId(event_id);
  return EventInviteModel.findOneAndUpdate({ user, event }, { invitation_accepted: true }, { new: true });
}

export async function getEventUserIds(event: any): Promise<string[]> {
  const rows = await EventInviteModel.find({ event }).select("user").lean();
  return rows.map((r: any) => r.user.toString());
}

export function getAllMeetingStartedByEventId(event_id: string) {
  const event = objectId(event_id);
  return EventInviteModel.find({ event, meeting_started: true }).populate("user", omitted_user_fields).populate("event");
}

export function startMeeting(user_id_list: string[], event_id: string) {
  const event = objectId(event_id);
  const user_id_list_object = user_id_list.map((user_id: string) => objectId(user_id));
  return EventInviteModel.updateMany({ user: { $in: user_id_list_object }, event }, { meeting_started: true }, { new: true });
}

export function getHasInvited(event_id: string, user_id: string) {
  const event = objectId(event_id);
  const user = objectId(user_id);
  return EventInviteModel.findOne({ event, user }).populate("user", omitted_user_fields).populate("event");
}