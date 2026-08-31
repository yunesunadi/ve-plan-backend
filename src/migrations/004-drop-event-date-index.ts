import { Migration } from "./runner";

const Event = require("../models/Event");

// The `{ type, date }` index backed the old calendar-day time/date filters.
// After the H-EVT-04 cutover those filters run on `starts_at` / `ends_at`
// (covered by `{ type, starts_at }` and `{ starts_at, _id }`), so this index is
// dead weight on every write. Drop it.
export const migration: Migration = {
  id: "004-drop-event-date-index",
  description: "Drop the now-unused { type, date } event index (superseded by { type, starts_at })",
  async up() {
    try {
      await Event.collection.dropIndex("type_1_date_1");
      console.log("  Dropped type_1_date_1");
    } catch (err: any) {
      if (err?.codeName === "IndexNotFound" || err?.code === 27) {
        console.log("  type_1_date_1 already absent");
      } else {
        throw err;
      }
    }

    await Event.createIndexes();
    console.log("  Indexes ensured for Event");
  },
};
