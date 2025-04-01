import mongoose, { Schema } from "mongoose";

const EventSchema = new Schema({
  cover: {
    type: String,
    default: null
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

EventSchema.pre('findOneAndDelete', async function (next) {
  try {
    const event = await mongoose.model("Event").findOne(this.getQuery());

    if (event) {
      await mongoose.model("Session").deleteMany({ event: event._id });
      await mongoose.model("EventRegister").deleteMany({ event: event._id });
      await mongoose.model("EventInvite").deleteMany({ event: event._id });
      await mongoose.model("Meeting").deleteMany({ event: event._id });
      await mongoose.model("Participant").deleteMany({ event: event._id });
    }

    next();
  } catch (err: any) {
    next(err);
  }
});

module.exports = mongoose.model("Event", EventSchema);