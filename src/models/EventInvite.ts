import mongoose, { Schema } from "mongoose";

const EventInviteSchema = new Schema({
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  invitation_sent: {
    type: Boolean,
    default: true,
  },
  invitation_accepted: {
    type: Boolean,
    default: false,
  },
  meeting_started: {
    type: Boolean,
    default: false,
  }
},
{
  timestamps: true,
  versionKey: false,
  autoIndex: process.env.NODE_ENV !== "production"
});

EventInviteSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("EventInvite", EventInviteSchema);