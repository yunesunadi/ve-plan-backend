import mongoose, { Schema } from "mongoose";
import { DEFAULT_EVENT_TZ } from "../helpers/eventTime";

const EventSchema = new Schema({
  cover: {
    type: String,
    default: null
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
  },
  start_time: {
    type: Date,
    required: true,
  },
  end_time: {
    type: Date,
    required: true,
  },
  timezone: {
    type: String,
    required: true,
    default: DEFAULT_EVENT_TZ,
  },
  starts_at: {
    type: Date,
  },
  ends_at: {
    type: Date,
  },
  category: {
    type: String,
    required: true,
    enum: ["conference", "meetup", "webinar"],
  },
  type: {
    type: String,
    required: true,
    enum: ["public", "private"],
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updateNotifiedAt: {
    type: Date,
    default: null,
  },
},
{
  timestamps: true,
  versionKey: false,
  autoIndex: process.env.NODE_ENV !== "production"
});

EventSchema.index({ user: 1 });
EventSchema.index({ starts_at: 1, _id: 1 });
EventSchema.index({ type: 1, starts_at: 1 });

async function cascadeEventDeletes(this: any, next: (err?: any) => void) {
  try {
    const events = await mongoose.model("Event").find(this.getQuery()).select("_id");
    const ids = events.map((event: any) => event._id);

    if (ids.length > 0) {
      const results = await Promise.allSettled([
        mongoose.model("Session").deleteMany({ event: { $in: ids } }),
        mongoose.model("EventRegister").deleteMany({ event: { $in: ids } }),
        mongoose.model("EventInvite").deleteMany({ event: { $in: ids } }),
        mongoose.model("Meeting").deleteMany({ event: { $in: ids } }),
        mongoose.model("Participant").deleteMany({ event: { $in: ids } }),
      ]);

      for (const result of results) {
        if (result.status === "rejected") {
          console.log("event cascade: a delete leg failed (sweep will reconcile)", result.reason);
        }
      }
    }

    next();
  } catch (err: any) {
    next(err);
  }
}

EventSchema.pre("findOneAndDelete", cascadeEventDeletes);
EventSchema.pre("deleteOne", { document: false, query: true }, cascadeEventDeletes);
EventSchema.pre("deleteMany", { document: false, query: true }, cascadeEventDeletes);

module.exports = mongoose.model("Event", EventSchema);