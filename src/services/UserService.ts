import { objectId } from "../helpers/utils";

const UserModel = require("../models/User");

export function create(reqObj: any) {
  return UserModel.create(reqObj);
}

export function findByEmail(email: string) {
  return UserModel.findOne({ email });
}

export function findById(id: string) {
  return UserModel.findById(objectId(id)).select("-password");
}

export function setRole(id: string, role: string) {
  return UserModel.findByIdAndUpdate(objectId(id), { role }, { new: true });
}

export function getRole(id: string) {
  return UserModel.findById(objectId(id)).select("role");
}

export function findAttendeesByNameOrEmail(keyword: string) {
  return UserModel
    .find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } }
      ],
      role: "attendee"
    })
    .select("-password");
}

export function update(id: string, data: any) {
  return UserModel.findOneAndUpdate(
    { _id: objectId(id) },
    {
      profile: data.profile,
      name: data.name,
      email: data.email
    }
  );
}