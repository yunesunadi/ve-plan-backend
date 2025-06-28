import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  profile: {
    type: String,
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["organizer", "attendee"]
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
  },
  verificationTokenExpires: {
    type: Date,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
},
{ 
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model("User", UserSchema);