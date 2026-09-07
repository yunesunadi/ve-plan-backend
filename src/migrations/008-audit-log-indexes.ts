import { Migration } from "./runner";

const AuditLog = require("../models/AuditLog");

export const migration: Migration = {
  id: "008-audit-log-indexes",
  description: "Build the AuditLog lookup + 400-day retention TTL indexes",
  async up() {
    await AuditLog.createIndexes();
    console.log("  Indexes ensured for AuditLog");
  },
};
