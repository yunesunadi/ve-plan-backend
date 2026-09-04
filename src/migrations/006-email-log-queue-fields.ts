import { Migration } from "./runner";

const EmailLog = require("../models/EmailLog");

// Step 1 of the durable email queue adds `meta` / `from` / `retryable` / `event`
// to EmailLog plus the sweep, event-rollup, and 30-day TTL indexes. The new
// fields are optional/defaulted, so there is no data backfill — this migration
// only ensures the indexes exist (production has autoIndex off).
export const migration: Migration = {
  id: "006-email-log-queue-fields",
  description: "Build the EmailLog queue-field indexes (sweep, event rollup, 30-day TTL)",
  async up() {
    await EmailLog.createIndexes();
    console.log("  Indexes ensured for EmailLog");
  },
};
