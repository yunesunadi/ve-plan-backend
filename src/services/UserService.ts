import mongoose from "mongoose";

const UserModel = require("../models/User");

export function create(reqObj: any) {
  return UserModel.create(reqObj);
}

export function findByEmail(email: string) {
  return UserModel.findOne({ email });
}

export function findById(_id: string) {
  return UserModel.findById({ _id });
}

export function setRole(id: string, role: string) {
  const _id = new mongoose.Types.ObjectId(id);
  return UserModel.findOneAndUpdate({ _id }, { role });
}

export async function getRole(_id: string) {
  const { role } = await UserModel.findById({ _id });
  return role;
}