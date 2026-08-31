import { Migration } from "./runner";
import { deriveInstants, DEFAULT_EVENT_TZ } from "../helpers/eventTime";

const Event = require("../models/Event");

const BATCH = 500;

// Backfill H-EVT-04's time model onto every pre-existing event: assign the
// default (server) timezone where none is stored, then derive `starts_at` /
// `ends_at` from (calendar day + time-of-day + timezone). Idempotent —
// recomputing from the same source fields yields the same instants — so it is
// safe to re-run.
export const migration: Migration = {
  id: "003-event-timezone-backfill",
  description: "Backfill event timezone and derived starts_at / ends_at instants",
  async up() {
    const cursor = Event
      .find({}, { date: 1, start_time: 1, end_time: 1, timezone: 1 })
      .cursor();

    let batch: any[] = [];
    let total = 0;

    const flush = async () => {
      if (batch.length === 0) return;
      await Event.bulkWrite(batch, { ordered: false });
      total += batch.length;
      batch = [];
    };

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const timezone = doc.timezone || DEFAULT_EVENT_TZ;
      const { starts_at, ends_at } = deriveInstants({
        date: doc.date,
        start_time: doc.start_time,
        end_time: doc.end_time,
        timezone,
      });

      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { timezone, starts_at, ends_at } },
        },
      });

      if (batch.length >= BATCH) await flush();
    }

    await flush();
    console.log(`  Backfilled ${total} event(s) (default timezone: ${DEFAULT_EVENT_TZ})`);

    await Event.createIndexes();
    console.log("  Indexes ensured for Event");
  },
};
