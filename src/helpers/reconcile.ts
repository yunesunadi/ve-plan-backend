import mongoose from "mongoose";
import { logger } from "./logger";

export async function sweepOrphans(): Promise<void> {
  const liveIds = await mongoose.model("Event").distinct("_id");

  const collections = ["Session", "EventRegister", "EventInvite", "Meeting", "Participant"];

  for (const name of collections) {
    const result = await mongoose
      .model(name)
      .deleteMany({ event: { $nin: liveIds } });

    if (result.deletedCount && result.deletedCount > 0) {
      logger.info(
        { collection: name, removed: result.deletedCount },
        "orphan sweep: removed rows with no parent event"
      );
    }
  }
}
