import mongoose, { Schema } from "mongoose";

const AuditLogSchema = new Schema({
  actor: {
    id: { type: Schema.Types.ObjectId, ref: "User" },
    role: { type: String },
    email: { type: String },
  },
  action: {
    type: String,
    required: true,
    enum: [
      "role.set",
      "register.approve",
      "invite.send",
      "meeting.create",
      "meeting.end",
      "event.delete",
      "account.delete",
      "password.change",
      "password.reset",
    ],
  },
  target: {
    type: { type: String },
    id: { type: String },
  },
  metadata: { type: Schema.Types.Mixed },
  requestId: { type: String },
  ip: { type: String },
},
{
  timestamps: true,
  versionKey: false,
  autoIndex: process.env.NODE_ENV !== "production",
});

AuditLogSchema.index({ "actor.id": 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ "target.type": 1, "target.id": 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
