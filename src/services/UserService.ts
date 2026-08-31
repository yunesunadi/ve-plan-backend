import { objectId, escapeRegExp } from "../helpers/utils";

const UserModel = require("../models/User");

const ATTENDEE_SEARCH_LIMIT = 50;

export function create(reqObj: any) {
  return UserModel.create(reqObj);
}

export function findByEmail(email: string) {
  return UserModel.findOne({ email });
}

export class AccountLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountLinkError";
  }
}

export async function upsertFacebookUser(params: {
  facebookId: string;
  name: string;
  email: string;
  profile?: string;
}) {
  let user = await UserModel.findOne({ email: params.email });

  if (user && !user.facebookId) {
    if (user.password) {
      throw new AccountLinkError(
        "An account with this email already exists. Sign in with your password, then link Facebook from settings."
      );
    }
    user.facebookId = params.facebookId;
    await user.save();
  }

  if (!user) {
    user = await create({
      name: params.name,
      email: params.email,
      facebookId: params.facebookId,
      isVerified: true,
      profile: params.profile,
    });
  }

  return user;
}

export async function upsertGoogleUser(params: {
  googleId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  profile?: string;
}) {
  let user = await UserModel.findOne({ email: params.email });

  if (user && !user.googleId) {
    if (user.password && !params.emailVerified) {
      throw new AccountLinkError(
        "An account with this email already exists. Sign in with your password, then link Google from settings."
      );
    }
    user.googleId = params.googleId;
    await user.save();
  }

  if (!user) {
    user = await create({
      name: params.name,
      email: params.email,
      googleId: params.googleId,
      isVerified: true,
      profile: params.profile,
    });
  }

  return user;
}

export function findById(id: string) {
  return UserModel.findById(objectId(id)).select("-password");
}

export async function hasPassword(id: string) {
  const user = await UserModel.findById(objectId(id)).select("password");
  return !!user?.password;
}

export function setRoleIfUnset(id: string, role: string) {
  return UserModel.findOneAndUpdate(
    { _id: objectId(id), $or: [{ role: { $exists: false } }, { role: null }] },
    { role },
    { new: true }
  );
}

export function getRole(id: string) {
  return UserModel.findById(objectId(id)).select("role");
}

export function findAttendeesByNameOrEmail(keyword: string, page = 1) {
  const safe = escapeRegExp(keyword);
  const skip = Math.max(0, (page - 1)) * ATTENDEE_SEARCH_LIMIT;

  return UserModel
    .find({
      $or: [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } }
      ],
      role: "attendee"
    })
    .select("name profile email")
    .sort({ name: 1 })
    .skip(skip)
    .limit(ATTENDEE_SEARCH_LIMIT);
}

export function update(id: string, data: { name: string; profile?: string }) {
  const patch: Record<string, unknown> = { name: data.name };
  if (data.profile !== undefined) patch.profile = data.profile;
  return UserModel.findOneAndUpdate({ _id: objectId(id) }, patch);
}

export function updatePassword(id: string, password: string) {
  return UserModel.findOneAndUpdate({ _id: objectId(id) }, { password });
}

export function findByVerificationToken(token: string) {
  return UserModel.findOne({ verificationToken: token });
}

export function findUnverifiedByEmail(email: string) {
  return UserModel.findOne({ email, isVerified: false });
}

export function verifyUser(id: string) {
  return UserModel.findByIdAndUpdate(
    objectId(id),
    { isVerified: true, verificationTokenExpires: null },
    { new: true }
  );
}

export function replaceUnverified(
  id: string,
  data: { name: string; password: string; profile?: string; verificationToken: string; verificationTokenExpires: Date }
) {
  const patch: Record<string, unknown> = {
    name: data.name,
    password: data.password,
    verificationToken: data.verificationToken,
    verificationTokenExpires: data.verificationTokenExpires,
  };
  if (data.profile !== undefined) patch.profile = data.profile;
  return UserModel.findByIdAndUpdate(objectId(id), patch, { new: true });
}

export function setVerificationToken(id: string, token: string, expires: Date) {
  return UserModel.findByIdAndUpdate(
    objectId(id),
    { verificationToken: token, verificationTokenExpires: expires },
    { new: true }
  );
}

export function setResetPasswordToken(id: string, token: string, expires: Date) {
  return UserModel.findByIdAndUpdate(
    objectId(id),
    { resetPasswordToken: token, resetPasswordExpires: expires },
    { new: true }
  );
}

export function findByResetPasswordToken(token: string) {
  return UserModel.findOne({ resetPasswordToken: token });
}

export function updatePasswordAndClearReset(id: string, password: string) {
  return UserModel.findByIdAndUpdate(
    objectId(id),
    {
      password,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null
    },
    { new: true }
  );
}

export function findAllVerified() {
  return UserModel.find({ isVerified: true });
}
