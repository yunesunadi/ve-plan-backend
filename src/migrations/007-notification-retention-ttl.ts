import { Migration } from "./runner";

const Notification = require("../models/Notification");

// H-NOT-02 — add the 90-day TTL index on Notification.createdAt so notification
// history stays bounded. The new fields are index-only (no data backfill); this
// migration just ensures the index exists, since production has autoIndex off.
export const migration: Migration = {
  id: "007-notification-retention-ttl",
  description: "Build the Notification 90-day retention TTL index",
  async up() {
    await Notification.createIndexes();
    console.log("  Indexes ensured for Notification");
  },
};
