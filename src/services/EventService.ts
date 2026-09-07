import { DateTime } from "luxon";
import { objectId, escapeRegExp, isEventExpired, meetingIsLive } from "../helpers/utils";
import { parsePaging } from "../helpers/paging";
import { deriveInstants, resolveTimezone, DEFAULT_EVENT_TZ } from "../helpers/eventTime";
import * as EventRegisterService from "./EventRegisterService";
import * as EventInviteService from "./EventInviteService";
import * as MeetingService from "./MeetingService";

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

export async function getParticipation(event: any, user: { _id: string; role: string }) {
  if (user.role !== "attendee") return null;

  const event_id = event._id.toString();
  const [register, invite, meeting] = await Promise.all([
    EventRegisterService.getHasRegistered(event_id, user._id),
    EventInviteService.getHasInvited(event_id, user._id),
    MeetingService.getOneByEventId(event_id),
  ]);

  let state: string;
  if (invite) state = invite.invitation_accepted ? "invitation_accepted" : "invited";
  else if (register) state = register.register_approved ? "registration_approved" : "registered";
  else state = "none";

  return { state, meeting_started: meetingIsLive(meeting) };
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

async function getOrganizerRecentActivity(event_ids: any[], limit = 10) {
  if (event_ids.length === 0) return [];

  const [registrations, acceptedInvites, startedMeetings] = await Promise.all([
    EventRegisterService.recentForEvents(event_ids, limit),
    EventInviteService.recentAcceptedForEvents(event_ids, limit),
    MeetingService.recentStartedForEvents(event_ids, limit),
  ]);

  const activity = [
    ...registrations.map((r: any) => ({
      type: "registration",
      event_id: r.event?._id ? String(r.event._id) : null,
      event_title: r.event?.title ?? null,
      actor_name: r.user?.name ?? null,
      at: r.createdAt,
    })),
    ...acceptedInvites.map((i: any) => ({
      type: "invitation_accepted",
      event_id: i.event?._id ? String(i.event._id) : null,
      event_title: i.event?.title ?? null,
      actor_name: i.user?.name ?? null,
      at: i.updatedAt,
    })),
    ...startedMeetings.map((m: any) => ({
      type: "meeting_started",
      event_id: m.event?._id ? String(m.event._id) : null,
      event_title: m.event?.title ?? null,
      actor_name: null,
      at: m.started_at,
    })),
  ];

  return activity
    .filter((a) => a.event_id && a.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

export async function getOrganizerSummary(user_id: string) {
  const organizer = objectId(user_id);
  const now = new Date();

  const events = await EventModel.find({ user: organizer })
    .sort({ starts_at: 1, _id: 1 })
    .populate("user", omitted_user_fields);

  const eventIds = events.map((e: any) => e._id);
  const upcoming = events.filter((e: any) => e.ends_at && new Date(e.ends_at) >= now);

  const [awaitingApproval, pendingInvitations, liveMeeting] = await Promise.all([
    EventRegisterService.countAwaitingApprovalForEvents(eventIds),
    EventInviteService.countPendingForEvents(eventIds),
    MeetingService.getLiveByEventIds(eventIds),
  ]);

  const live_meeting = liveMeeting
    ? {
        event_id: String(liveMeeting.event?._id ?? liveMeeting.event),
        title: liveMeeting.event?.title ?? null,
      }
    : null;

  return {
    upcoming_events_count: upcoming.length,
    registrations_awaiting_approval_count: awaitingApproval,
    pending_invitations_count: pendingInvitations,
    next_event: upcoming[0] ?? null,
    live_meeting,
    recent_activity: await getOrganizerRecentActivity(eventIds),
  };
}

function attendeeStateByEvent(invites: any[], registers: any[]) {
  const membership = new Map<string, { state: string; at: Date }>();
  for (const r of registers) {
    membership.set(String(r.event), {
      state: r.register_approved ? "registration_approved" : "registered",
      at: r.updatedAt ?? r.createdAt,
    });
  }
  for (const i of invites) {
    membership.set(String(i.event), {
      state: i.invitation_accepted ? "invitation_accepted" : "invited",
      at: i.updatedAt ?? i.createdAt,
    });
  }
  return membership;
}

export async function getAttendeeSummary(user_id: string) {
  const nowMs = Date.now();
  const soonCutoff = new Date(nowMs + 24 * 60 * 60 * 1000);

  const [invites, registers] = await Promise.all([
    EventInviteService.listMembershipsForUser(user_id),
    EventRegisterService.listMembershipsForUser(user_id),
  ]);

  const membership = attendeeStateByEvent(invites as any[], registers as any[]);

  const confirmedIds = [...membership]
    .filter(([, m]) => m.state === "registration_approved" || m.state === "invitation_accepted")
    .map(([id]) => objectId(id));
  const pendingInviteIds = (invites as any[])
    .filter((i) => !i.invitation_accepted)
    .map((i) => objectId(i.event));
  const excludeIds = [...membership.keys()].map((id) => objectId(id));

  const [confirmedEvents, pendingInvitationEvents, liveMeeting, recommended] = await Promise.all([
    EventModel.find({ _id: { $in: confirmedIds } }).populate("user", omitted_user_fields),
    EventModel.find({ _id: { $in: pendingInviteIds } })
      .sort({ starts_at: 1, _id: 1 })
      .populate("user", omitted_user_fields),
    MeetingService.getLiveByEventIds(confirmedIds),
    EventModel.find({ type: "public", starts_at: { $gt: new Date() }, _id: { $nin: excludeIds } })
      .sort({ starts_at: 1, _id: 1 })
      .limit(6)
      .populate("user", omitted_user_fields),
  ]);

  const liveEventId = liveMeeting ? String(liveMeeting.event?._id ?? liveMeeting.event) : null;

  const happening_now = confirmedEvents.filter((e: any) => String(e._id) === liveEventId);
  const starting_soon = confirmedEvents
    .filter((e: any) => {
      if (!e.starts_at || String(e._id) === liveEventId) return false;
      const startsAt = new Date(e.starts_at);
      return startsAt.getTime() > nowMs && startsAt <= soonCutoff;
    })
    .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return {
    happening_now,
    starting_soon,
    pending_invitations: pendingInvitationEvents,
    recommended,
  };
}

const MY_EVENTS_FILTERS: Record<string, string[]> = {
  all: ["invited", "registered", "registration_approved", "invitation_accepted"],
  invited: ["invited"],
  registered: ["registered"],
  approved: ["registration_approved"],
  attending: ["invitation_accepted"],
};

export async function getMyEventsForAttendee(user_id: string, query: any = {}) {
  const { offset, limit } = parsePaging(query, { defaultLimit: 10 });
  const filterKey =
    typeof query.filter === "string" && MY_EVENTS_FILTERS[query.filter] ? query.filter : "all";
  const allowedStates = new Set(MY_EVENTS_FILTERS[filterKey]);

  const [invites, registers] = await Promise.all([
    EventInviteService.listMembershipsForUser(user_id),
    EventRegisterService.listMembershipsForUser(user_id),
  ]);

  const membership = attendeeStateByEvent(invites as any[], registers as any[]);
  const candidateIds = [...membership.keys()].map((id) => objectId(id));

  const events = await EventModel.find({ _id: { $in: candidateIds } }).populate(
    "user",
    omitted_user_fields
  );

  const rows = events
    .map((event: any) => ({ event, ...membership.get(String(event._id))! }))
    .filter((row: any) => allowedStates.has(row.state))
    .sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const items = rows.slice(offset, offset + limit).map((row: any) => ({
    ...row.event.toObject(),
    participation_state: row.state,
  }));

  return { items, total: rows.length, offset, limit };
}
