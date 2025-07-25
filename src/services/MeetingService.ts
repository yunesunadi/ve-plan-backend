import { objectId } from "../helpers/utils";

const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const MeetingModel = require("../models/Meeting");

const omitted_user_fields = "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -googleId -facebookId";

export function createToken(name: string, email: string, is_moderator: boolean) {  
  const privateKey = fs.readFileSync(path.join(__dirname, "privatekey.pem"), "utf8");

  const token = jwt.sign({
    aud: "jitsi",
    context: {
      user: {
        name,
        email,
        moderator: is_moderator
      },
      features: {
        livestreaming: true,
        recording: true,
        transcription: true,
        "outbound-call": true
      }
    },
    iss: "chat",
    room: "*",
    sub: process.env.JITSI_APP_ID,
    exp: Math.round(new Date(new Date().getTime() + 24 * 60 * 60 * 1000).getTime() / 1000),
    nbf: (Math.round((new Date).getTime() / 1000) - 10)
  }, 
  privateKey,
  { algorithm: "RS256", header: { kid: process.env.JITSI_API_KEY } }
  );

  return token;
}

export function create(reqObj: any) {
  return MeetingModel.create(reqObj);
}

export function getOneById(event_id: string, user_id: string) {
  const event = objectId(event_id);
  const user = objectId(user_id);
  return MeetingModel.findOne({ event, user }).populate("event").populate("user", omitted_user_fields);
}

export function getOneByEventId(event_id: string) {
  return MeetingModel.findOne({ event: objectId(event_id) }).populate("event").populate("user", omitted_user_fields);
}

export function update(id: string, meeting: any) {
  return MeetingModel.findByIdAndUpdate(objectId(id), meeting, { new: true });
}
