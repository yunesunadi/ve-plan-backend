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
  meeting_started: {
    type: Boolean,
    default: false,
  }
},
{ 
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model("EventRegister", EventRegisterSchema);