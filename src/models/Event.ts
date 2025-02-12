import mongoose, { Schema } from "mongoose";

const EventSchema = new Schema({
  cover: {
    type: String,
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
  },
  start_time: {
    type: String,
    require: true,
  },
  end_time: {
    type: String,
    require: true,
  },
  category: {
    type: String,
    requrie: true,
  },
  type: {
    type: String,
    require: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    require: true,
  },
},
{ 
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model("Event", EventSchema);