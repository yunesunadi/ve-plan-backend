import { objectId } from "../helpers/utils";

const EventModel = require("../models/Event");

export function create(reqObj: any) {
  return EventModel.create(reqObj);
}

export function getAll(role: string) {
  if (role === "organizer") {
    return EventModel.find();
  }
  return EventModel.find({ type: "public" });
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
  let result, time_query = {}, category_query = {}, search_query = {}, date_query = {};
  const currentDate = new Date();

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
          time_query = { date: currentDate };
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

    if (query.limit) {
      result = EventModel.find(getQuery(search_query, time_query, category_query, date_query)).limit(query.limit);
    }

    if (query.offset) {
      result = EventModel.find(getQuery(search_query, time_query, category_query, date_query)).skip(query.offset).limit(query.limit);
    }
  } else {
    if (query.limit) {
      result = EventModel.find({ type: "public" }).limit(query.limit);
    }

    if (query.offset) {
      result = EventModel.find({ type: "public" }).skip(query.offset).limit(query.limit);
    }
  }
  
  return result;
}

export function getMyEvents(query: any, user_id: string) {
  let result, type_query = {};

  if (Object.entries(query).length > 0) {
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

    if (query.limit) {
      result = EventModel.find(qry).limit(query.limit);
    }

    if (query.offset) {
      result = EventModel.find(qry).skip(query.offset).limit(query.limit);
    }
  } else {
    if (query.limit) {
      result = EventModel.find({ user: objectId(user_id) }).limit(query.limit);
    }

    if (query.offset) {
      result = EventModel.find({ user: objectId(user_id) }).skip(query.offset).limit(query.limit);
    }
  }

  return result;
}

export function getOneById(id: string) {
  return EventModel.findById(objectId(id)).populate("user", "-password");
}

export function update(id: string, event: any) {
  return EventModel.findByIdAndUpdate(objectId(id), event, { new: true });
}

export function deleteOne(id: string) {
  return EventModel.findOneAndDelete(objectId(id));
}
