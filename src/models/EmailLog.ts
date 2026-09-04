import mongoose, { Schema } from "mongoose";

const EmailLogSchema = new Schema({
  to: { type: String, required: true },
  action: { type: String, required: true },
  subject: { type: String },
  from: { type: String },
  meta: { type: Schema.Types.Mixed },
  event: { type: Schema.Types.ObjectId, ref: "Event", sparse: true },
  status: {
    type: String,
    required: true,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
  attempts: { type: Number, default: 0 },
  retryable: { type: Boolean, default: false },
  lastError: { type: String },
  sentAt: { type: Date, default: null },
},
{
  timestamps: true,
  versionKey: false,
  autoIndex: process.env.NODE_ENV !== "production",
});

EmailLogSchema.index({ status: 1, createdAt: 1 });
EmailLogSchema.index({ action: 1, createdAt: -1 });
EmailLogSchema.index({ status: 1, retryable: 1, updatedAt: 1 });
EmailLogSchema.index({ event: 1, status: 1 });
EmailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("EmailLog", EmailLogSchema);
