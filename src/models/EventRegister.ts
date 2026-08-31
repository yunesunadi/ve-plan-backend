import mongoose, { Schema } from "mongoose";

const EventRegisterSchema = new Schema({
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
  register_approved: {
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

EventRegisterSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("EventRegister", EventRegisterSchema);