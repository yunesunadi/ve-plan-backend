import mongoose, { Schema } from "mongoose";

const ParticipantSchema = new Schema({
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
    default: Date.now
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
},
{
  timestamps: true,
  versionKey: false,
  autoIndex: process.env.NODE_ENV !== "production"
});

ParticipantSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Participant", ParticipantSchema);