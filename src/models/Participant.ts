import mongoose, { Schema } from "mongoose";

const ParticipantSchema = new Schema({
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
    default: Date.now
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
},
{
  timestamps: true,
  versionKey: false,
  autoIndex: process.env.NODE_ENV !== "production"
});

ParticipantSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Participant", ParticipantSchema);