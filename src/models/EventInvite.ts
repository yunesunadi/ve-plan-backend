import mongoose, { Schema } from "mongoose";

const EventInviteSchema = new Schema({
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    require: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    require: true,
  },
  invitation_sent: {
    type: Boolean,
    default: true,
  },
  invitation_accepted: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model("EventInvite", EventInviteSchema);