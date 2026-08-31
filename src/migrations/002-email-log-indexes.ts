import { Migration } from "./runner";

const EmailLog = require("../models/EmailLog");

export const migration: Migration = {
  id: "002-email-log-indexes",
  description: "Build the EmailLog collection's lookup indexes",
  async up() {
    await EmailLog.createIndexes();
    console.log("  Indexes ensured for EmailLog");
  },
};
