import mongoose, { Schema } from "mongoose";

const MeetingSchema = new Schema({
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
  room_name: {
    type: String,
    require: true,
  },
  start_time: {
    type: Date,
    require: false,
    default: null
  },
  end_time: {
    type: Date,
    require: false,
    default: null
  },
  duration: {
    type: Number,
    require: false,
  },
  ended: {
    type: Boolean,
    default: false
  },
  ended_at: {
    type: Date,
    require: false,
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
