import { objectId } from "../helpers/utils";

const EventModel = require("../models/Event");

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
      search_query = { title: { $regex: query.search_value, $options: 'i' } };
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

  let result = EventModel.find(filter);

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

  let result = EventModel.find(qry);

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

export function update(id: string, event: any) {
  return EventModel.findByIdAndUpdate(objectId(id), event, { new: true });
}

export function deleteOne(id: string) {
  return EventModel.findOneAndDelete(objectId(id));
}
