import mongoose from "mongoose";

require("dotenv").config();

export interface Migration {
  id: string;
  description: string;
  up: () => Promise<void>;
}

const COLLECTION = "_migrations";

async function appliedIds(): Promise<Set<string>> {
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection.");
  const rows = await db.collection(COLLECTION).find({}, { projection: { _id: 1 } }).toArray();
  return new Set(rows.map((row: any) => row._id));
}

async function markApplied(id: string) {
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection.");
  await db.collection(COLLECTION).insertOne({ _id: id as any, appliedAt: new Date() });
}

async function connect() {
  if (!process.env.DB_URL) {
    throw new Error("DB_URL is not set.");
  }
  await mongoose.connect(process.env.DB_URL);
}

// Run every migration in `migrations` that has not been recorded yet, in
// order, and record each as it completes. Safe to run repeatedly — already
// applied migrations are skipped.
export async function run(migrations: Migration[]) {
  await connect();

  try {
    const done = await appliedIds();
    const pending = migrations.filter((migration) => !done.has(migration.id));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    for (const migration of pending) {
      console.log(`Running ${migration.id} — ${migration.description}`);
      await migration.up();
      await markApplied(migration.id);
      console.log(`Applied ${migration.id}`);
    }

    console.log(`Done. ${pending.length} migration(s) applied.`);
  } finally {
    await mongoose.disconnect();
  }
}

// Print which migrations have run and which are pending, without changing
// anything.
export async function status(migrations: Migration[]) {
  await connect();

  try {
    const done = await appliedIds();

    for (const migration of migrations) {
      const mark = done.has(migration.id) ? "[applied]" : "[pending]";
      console.log(`${mark} ${migration.id} — ${migration.description}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}
