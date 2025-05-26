import { objectId } from "../helpers/utils";

const EventModel = require("../models/Event");

export function create(reqObj: any) {
  return EventModel.create(reqObj);
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

export function getAll(query: any) {
  let result, time_query = {}, category_query = {}, search_query = {};
  const currentDate = new Date();

  if (query) {
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

    result = EventModel.find(getQuery(search_query, time_query, category_query));
  } else {
    result = EventModel.find({ type: "public" });
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
