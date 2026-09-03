import mongoose from "mongoose";

export async function sweepOrphans(): Promise<void> {
  const liveIds = await mongoose.model("Event").distinct("_id");

  const collections = ["Session", "EventRegister", "EventInvite", "Meeting", "Participant"];

  for (const name of collections) {
    const result = await mongoose
      .model(name)
      .deleteMany({ event: { $nin: liveIds } });

    if (result.deletedCount && result.deletedCount > 0) {
      console.log(`orphan sweep: removed ${result.deletedCount} ${name} row(s) with no parent event`);
    }
  }
}
