import { Migration } from "./runner";

const User = require("../models/User");

// H-AUTH-07 introduces `tokenVersion` on the user document — the counter
// `checkUser` compares against the JWT's `tokenVersion` claim to detect a
// revoked session. Seed it to 0 on every pre-existing account so the field is
// always a number. Idempotent: accounts that already have it are skipped by
// the `$exists` filter, and re-running sets nothing.
export const migration: Migration = {
  id: "005-user-token-version",
  description: "Backfill tokenVersion: 0 onto every pre-existing user",
  async up() {
    const result = await User.updateMany(
      { tokenVersion: { $exists: false } },
      { $set: { tokenVersion: 0 } }
    );
    console.log(`  Backfilled tokenVersion on ${result.modifiedCount} user(s)`);
  },
};
