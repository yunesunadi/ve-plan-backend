import { Migration } from "./runner";
import { migration as m001 } from "./001-dedupe-and-index";
import { migration as m002 } from "./002-email-log-indexes";
import { migration as m003 } from "./003-event-timezone-backfill";
import { migration as m004 } from "./004-drop-event-date-index";
import { migration as m005 } from "./005-user-token-version";

// Every migration, in the order it must run. Append new entries; never
// reorder or remove.
export const migrations: Migration[] = [m001, m002, m003, m004, m005];
