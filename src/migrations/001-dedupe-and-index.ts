import { Migration } from "./runner";

const EventRegister = require("../models/EventRegister");
const EventInvite = require("../models/EventInvite");
const Participant = require("../models/Participant");
const Meeting = require("../models/Meeting");
const Event = require("../models/Event");
const Session = require("../models/Session");
const Notification = require("../models/Notification");
const User = require("../models/User");

const min = (values: Date[]) => values.reduce((a, b) => (a < b ? a : b));
const max = (values: Date[]) => values.reduce((a, b) => (a > b ? a : b));

// Collapse every {event, user} group that has more than one row down to a
// single row, folding the "was this true anywhere" flags together so no state
// is lost, then delete the extras. Runs before the unique index is built.
async function dedupeByEventUser(Model: any, merge: (docs: any[]) => any) {
  const groups = await Model.aggregate([
    { $group: { _id: { event: "$event", user: "$user" }, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removed = 0;

  for (const group of groups) {
    const docs = await Model.find({ _id: { $in: group.ids } }).sort({ createdAt: 1 }).lean();
    const keep = docs[0];
    const rest = docs.slice(1);

    await Model.updateOne({ _id: keep._id }, { $set: merge(docs) });
    const result = await Model.deleteMany({ _id: { $in: rest.map((doc: any) => doc._id) } });
    removed += result.deletedCount || 0;
  }

  return { groups: groups.length, removed };
}

// Meetings are unique per event (not per event+user) — a second organizer
// must never have created one. Keep the event owner's meeting when there is a
// clash, otherwise the oldest.
async function dedupeMeetingsByEvent() {
  const groups = await Meeting.aggregate([
    { $group: { _id: "$event", ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removed = 0;

  for (const group of groups) {
    const docs = await Meeting.find({ _id: { $in: group.ids } }).sort({ createdAt: 1 }).lean();
    const event = await Event.findById(group._id).lean();
    const keep = (event && docs.find((doc: any) => String(doc.user) === String(event.user))) || docs[0];
    const rest = docs.filter((doc: any) => String(doc._id) !== String(keep._id));

    const result = await Meeting.deleteMany({ _id: { $in: rest.map((doc: any) => doc._id) } });
    removed += result.deletedCount || 0;
  }

  return { groups: groups.length, removed };
}

export const migration: Migration = {
  id: "001-dedupe-and-index",
  description: "Merge duplicate join-table rows, then build the unique/lookup indexes (H-X-04)",
  async up() {
    const registers = await dedupeByEventUser(EventRegister, (docs) => ({
      register_approved: docs.some((doc) => doc.register_approved),
      meeting_started: docs.some((doc) => doc.meeting_started),
    }));
    console.log(`  EventRegister: ${registers.groups} duplicate group(s), ${registers.removed} row(s) removed`);

    const invites = await dedupeByEventUser(EventInvite, (docs) => ({
      invitation_sent: docs.some((doc) => doc.invitation_sent),
      invitation_accepted: docs.some((doc) => doc.invitation_accepted),
      meeting_started: docs.some((doc) => doc.meeting_started),
    }));
    console.log(`  EventInvite: ${invites.groups} duplicate group(s), ${invites.removed} row(s) removed`);

    const participants = await dedupeByEventUser(Participant, (docs) => {
      const starts = docs.map((doc) => doc.start_time).filter(Boolean).map((value: any) => new Date(value));
      const ends = docs.map((doc) => doc.end_time).filter(Boolean).map((value: any) => new Date(value));
      const durations = docs.map((doc) => doc.duration).filter((value: any) => typeof value === "number");
      return {
        room_name: docs.map((doc) => doc.room_name).find(Boolean) ?? null,
        start_time: starts.length ? min(starts) : null,
        // if any session was never closed out, treat the merged row as still open
        end_time: docs.some((doc) => !doc.end_time) ? null : (ends.length ? max(ends) : null),
        duration: durations.length ? durations.reduce((a: number, b: number) => a + b, 0) : null,
      };
    });
    console.log(`  Participant: ${participants.groups} duplicate group(s), ${participants.removed} row(s) removed`);

    const meetings = await dedupeMeetingsByEvent();
    console.log(`  Meeting: ${meetings.groups} duplicate group(s), ${meetings.removed} row(s) removed`);

    // Now that the collections are clean, build every schema-declared index.
    // `createIndexes` is idempotent — existing indexes are left alone.
    for (const Model of [User, Event, Session, EventRegister, EventInvite, Meeting, Participant, Notification]) {
      await Model.createIndexes();
      console.log(`  Indexes ensured for ${Model.modelName}`);
    }
  },
};
