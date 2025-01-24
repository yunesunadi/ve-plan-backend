import { objectId } from "../helpers/utils";

const UserModel = require("../models/User");

export function create(reqObj: any) {
  return UserModel.create(reqObj);
}

export function findByEmail(email: string) {
  return UserModel.findOne({ email });
}

export function findById(id: string) {
  const _id = objectId(id);
  return UserModel.findById({ _id });
}

export function setRole(id: string, role: string) {
  const _id = objectId(id);
  return UserModel.findOneAndUpdate({ _id }, { role });
}

export async function getRole(id: string) {
  const _id = objectId(id);
  const { role } = await UserModel.findById({ _id });
  return role;
}