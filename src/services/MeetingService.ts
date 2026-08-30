import { objectId } from "../helpers/utils";

const jwt = require("jsonwebtoken");
const fs = require("fs");
const crypto = require("crypto");
const MeetingModel = require("../models/Meeting");

const omitted_user_fields = "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -googleId -facebookId";

const MEETING_TOKEN_TTL_SECONDS = 2 * 60 * 60;

export function generateRoomName(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function createToken(
  name: string,
  email: string,
  is_moderator: boolean,
  room_name: string
): string {
  const privateKeyPath = process.env.PRIVATE_KEY_PATH;

  if (!privateKeyPath) {
    throw new Error("PRIVATE_KEY_PATH is not configured");
  }

  const privateKey = fs.readFileSync(privateKeyPath, "utf8");
  const now = Math.round(new Date().getTime() / 1000);

  const token = jwt.sign({
    aud: "jitsi",
    context: {
      user: {
        name,
        email,
        moderator: is_moderator
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false
      }
    },
    iss: "chat",
    room: room_name,
    sub: process.env.JITSI_APP_ID,
    exp: now + MEETING_TOKEN_TTL_SECONDS,
    nbf: now - 10
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

export function setEnded(id: string, ended: boolean) {
  return MeetingModel.findByIdAndUpdate(
    objectId(id),
    { ended, ended_at: ended ? new Date() : null },
    { new: true }
  );
}
