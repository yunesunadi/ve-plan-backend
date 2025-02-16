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
  token: {
    type: String,
    require: true,
  }
},
{ 
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model("Meeting", MeetingSchema);
