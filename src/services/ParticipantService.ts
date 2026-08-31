import { objectId } from "../helpers/utils";

const ParticipantModel = require("../models/Participant");
const MeetingModel = require("../models/Meeting");

const omitted_user_fields = "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires -googleId -facebookId";

export function getOne(event_id: string, user_id: string) {
  const event = objectId(event_id);
  const user = objectId(user_id);
  return ParticipantModel.findOne({ event, user }).populate("user", omitted_user_fields);
}

export function create(reqObj: any) {
  return ParticipantModel.create(reqObj);
}

export function update(id: string, participant: any) {
  return ParticipantModel.findByIdAndUpdate(objectId(id), participant, { new: true });
}

export function getAll(event_id: string) {
  const event = objectId(event_id);
  return ParticipantModel.find({ event })
    .populate("user", omitted_user_fields)
    .sort({ start_time: 1, _id: 1 });
}

export function getAllWithNoEndTime(event_id: string) {
  const event = objectId(event_id);
  return ParticipantModel.find({ event, end_time: null }).populate("user", omitted_user_fields);
}

export function countPresent(event_id: string) {
  return ParticipantModel.countDocuments({ event: objectId(event_id), end_time: null });
}

export async function closeDanglingForEvent(event_id: string | object, cutoff: Date) {
  const event = typeof event_id === "string" ? objectId(event_id) : event_id;
  const dangling = await ParticipantModel.find({ event, end_time: null });

  await Promise.all(dangling.map((participant: any) => {
    const start = participant.start_time ? new Date(participant.start_time).getTime() : cutoff.getTime();
    const minutes = Math.max(0, Math.round((cutoff.getTime() - start) / 60000));
    return ParticipantModel.findByIdAndUpdate(participant._id, {
      end_time: cutoff,
      duration: (participant.duration || 0) + minutes,
    });
  }));

  return dangling.length;
}

export async function closeDanglingForEndedMeetings() {
  const endedMeetings = await MeetingModel.find({ ended: true }).select("event ended_at");

  for (const meeting of endedMeetings) {
    const cutoff = meeting.ended_at ? new Date(meeting.ended_at) : new Date();
    await closeDanglingForEvent(meeting.event, cutoff);
  }
}
