import mongoose, { Schema } from "mongoose";

const EventRegisterSchema = new Schema({
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
  register_approved: {
    type: Boolean,
    default: false,
  },
  invitation_sent: {
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

module.exports = mongoose.model("EventRegister", EventRegisterSchema);