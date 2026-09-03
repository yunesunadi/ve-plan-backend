import { DateTime } from "luxon";
import { objectId, escapeRegExp, isEventExpired } from "../helpers/utils";
import { parsePaging } from "../helpers/paging";
import { deriveInstants, resolveTimezone, DEFAULT_EVENT_TZ } from "../helpers/eventTime";
import * as EventRegisterService from "./EventRegisterService";
import * as EventInviteService from "./EventInviteService";

const EventModel = require("../models/Event");

function withDerivedInstants(data: any) {
  if (data?.date && data?.start_time && data?.end_time) {
    const timezone = resolveTimezone(data.timezone);
    const { starts_at, ends_at } = deriveInstants({
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      timezone,
    });
    return { ...data, timezone, starts_at, ends_at };
  }
  return data;
}

const SEARCH_MAX_LENGTH = 100;

const omitted_user_fields = "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -googleId -facebookId";

export function create(reqObj: any) {
  return EventModel.create(withDerivedInstants(reqObj));
}

export function getAll(role: string) {
  if (role === "organizer") {
    return EventModel.find().populate("user", omitted_user_fields);
  }
  return EventModel.find({ type: "public" }).populate("user", omitted_user_fields);
}

const getQuery = (...query: any) => {
  const source_query = {
    type: "public"
  };

  return {
    $and: [
      source_query,
      ...query
    ]
  };
}

export async function getAllByQuery(query: any) {
  let time_query = {}, category_query = {}, search_query = {}, date_query = {};
  const now = new Date();
  let filter: any = { type: "public" };

  if (Object.entries(query).length > 0) {
    if (query.search_value) {
      const safe = escapeRegExp(String(query.search_value).slice(0, SEARCH_MAX_LENGTH));
      search_query = { title: { $regex: safe, $options: 'i' } };
    }

    if (query.time) {
      switch (query.time) {
        case "upcoming":
          time_query = { starts_at: { $gt: now } };
        break;
        case "happening":
          time_query = { starts_at: { $lte: now }, ends_at: { $gte: now } };
        break;
        case "past":
          time_query = { ends_at: { $lt: now } };
        break;
      }
    }

    if (query.category) {
      category_query = { category: query.category };
    }

    if (query.date) {
      const anchor = DateTime.fromISO(String(query.date), { zone: DEFAULT_EVENT_TZ });
      if (anchor.isValid) {
        const dayStart = anchor.startOf("day");
        date_query = { starts_at: { $gte: dayStart.toJSDate(), $lt: dayStart.plus({ days: 1 }).toJSDate() } };
      }
    }

    filter = getQuery(search_query, time_query, category_query, date_query);
  }

  const { offset, limit } = parsePaging(query, { defaultLimit: 5 });

  const [items, total] = await Promise.all([
    EventModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .populate("user", omitted_user_fields),
    EventModel.countDocuments(filter),
  ]);

  return { items, total, offset, limit };
}

export async function getMyEvents(query: any, user_id: string) {
  let type_query = {};

  if (query.type) {
    switch (query.type) {
      case "all":
        type_query = { };
      break;
      case "public":
        type_query = { type: "public" };
      break;
      case "private":
        type_query = { type: "private" };
      break;
    }
  }

  const qry = { ...type_query, user: objectId(user_id) };

  const { offset, limit } = parsePaging(query, { defaultLimit: 5 });

  const [items, total] = await Promise.all([
    EventModel.find(qry)
      .sort({ createdAt: -1, _id: -1 })
      .skip(offset)
      .limit(limit)
      .populate("user", omitted_user_fields),
    EventModel.countDocuments(qry),
  ]);

  return { items, total, offset, limit };
}

export function getOneById(id: string) {
  return EventModel.findById(objectId(id)).populate("user", omitted_user_fields);
}

export async function canUserView(event: any, user_id: string): Promise<boolean> {
  if (!event) return false;
  if (event.type === "public") return true;
  if (event.user._id.toString() === user_id) return true;

  const [registered, invited] = await Promise.all([
    EventRegisterService.getHasRegistered(event._id.toString(), user_id),
    EventInviteService.getHasInvited(event._id.toString(), user_id),
  ]);
  if (registered) return true;
  if (invited && !isEventExpired(event)) return true;
  return false;
}

export function update(id: string, event: any) {
  return EventModel.findByIdAndUpdate(objectId(id), withDerivedInstants(event), { new: true });
}

export async function getParticipantUserIds(event_id: string): Promise<string[]> {
  const event = objectId(event_id);
  const [registered, invited] = await Promise.all([
    EventRegisterService.getEventUserIds(event),
    EventInviteService.getEventUserIds(event),
  ]);
  return [...new Set([...registered, ...invited])];
}

export function deleteOne(id: string) {
  return EventModel.findOneAndDelete(objectId(id));
}
