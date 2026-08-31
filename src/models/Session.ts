import mongoose, { Schema } from "mongoose";

const SessionSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  speaker_info: {
    type: String,
  },
  start_time: {
    type: Date,
    require: true,
  },
  end_time: {
    type: Date,
    require: true,
  },
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    require: true,
  },
},
{
  timestamps: true,
  versionKey: false,
  autoIndex: process.env.NODE_ENV !== "production"
});

SessionSchema.index({ event: 1 });

module.exports = mongoose.model("Session", SessionSchema);