import mongoose, { Schema } from "mongoose";

const EmailLogSchema = new Schema({
  to: { type: String, required: true },
  action: { type: String, required: true },
  subject: { type: String },
  status: {
    type: String,
    required: true,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
  attempts: { type: Number, default: 0 },
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

module.exports = mongoose.model("EmailLog", EmailLogSchema);
