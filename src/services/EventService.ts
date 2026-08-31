import { objectId, escapeRegExp } from "../helpers/utils";
import * as EventRegisterService from "./EventRegisterService";
import * as EventInviteService from "./EventInviteService";

const EventModel = require("../models/Event");

const SEARCH_MAX_LENGTH = 100;

const omitted_user_fields = "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -googleId -facebookId";

export function create(reqObj: any) {
  return EventModel.create(reqObj);
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

export function getAllByQuery(query: any) {
  let time_query = {}, category_query = {}, search_query = {}, date_query = {};
  const currentDate = new Date();
  const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
  let filter: any = { type: "public" };

  if (Object.entries(query).length > 0) {
    if (query.search_value) {
      const safe = escapeRegExp(String(query.search_value).slice(0, SEARCH_MAX_LENGTH));
      search_query = { title: { $regex: safe, $options: 'i' } };
    }

    if (query.time) {
      switch (query.time) {
        case "upcoming":
          time_query = { date: { $gt: currentDate } };
        break;
        case "happening":
          time_query = { date: { $gte: startOfDay, $lt: endOfDay } };
        break;
        case "past":
          time_query = { date: { $lt: currentDate } };
        break;
      }
    }

    if (query.category) {
      category_query = { category: query.category };
    }

    if (query.date) {
      date_query = { date: query.date };
    }

    filter = getQuery(search_query, time_query, category_query, date_query);
  }

  let result = EventModel.find(filter).sort({ createdAt: -1, _id: -1 });

  if (query.offset) {
    result = result.skip(query.offset);
  }

  if (query.limit) {
    result = result.limit(query.limit);
  }

  return result.populate("user", omitted_user_fields);
}

export function getMyEvents(query: any, user_id: string) {
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

  let result = EventModel.find(qry).sort({ createdAt: -1, _id: -1 });

  if (query.offset) {
    result = result.skip(query.offset);
  }

  if (query.limit) {
    result = result.limit(query.limit);
  }

  return result.populate("user", omitted_user_fields);
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
  return Boolean(registered || invited);
}

export function update(id: string, event: any) {
  return EventModel.findByIdAndUpdate(objectId(id), event, { new: true });
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
