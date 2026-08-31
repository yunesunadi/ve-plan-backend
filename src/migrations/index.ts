import { Migration } from "./runner";
import { migration as m001 } from "./001-dedupe-and-index";

// Every migration, in the order it must run. Append new entries; never
// reorder or remove.
export const migrations: Migration[] = [m001];
