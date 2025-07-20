import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: "Event"
  },
  type: {
    type: String,
    required: true,
    enum: [
      "first_time_register",
      "event_created",
      "register_approved",
      "event_invited",
      "meeting_started",
      "event_updated",
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model("Notification", NotificationSchema);