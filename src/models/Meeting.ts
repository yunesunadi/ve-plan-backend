import mongoose, { Schema } from "mongoose";

const MeetingSchema = new Schema({
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
  room_name: {
    type: String,
    required: true,
  },
  start_time: {
    type: Date,
    required: false,
    default: null
  },
  end_time: {
    type: Date,
    required: false,
    default: null
  },
  duration: {
    type: Number,
    required: false,
  },
  ended: {
    type: Boolean,
    default: false
  },
  ended_at: {
    type: Date,
    required: false,
    default: null
  },
},
{
  timestamps: true,
  versionKey: false,
  autoIndex: process.env.NODE_ENV !== "production",
  toJSON: {
    transform: function (_doc: any, ret: any) {
      delete ret.token;
      return ret;
    }
  }
});

MeetingSchema.index({ event: 1 }, { unique: true });

module.exports = mongoose.model("Meeting", MeetingSchema);
