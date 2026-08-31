import { Response } from "express";
import { isRequestInvalid, maskEmail } from "../helpers/utils";
import { verifyImageFile, removeUpload } from "../helpers/uploads";
import { hashPassword, comparePassword } from "../helpers/password";
import * as UserService from "../services/UserService";

const MIN_ATTENDEE_SEARCH_LENGTH = 2;

export async function hasRole(req: any, res: Response) {
  try {
    const { role } = await UserService.getRole(req.user._id);
    
    if (!role) {
      return res.status(200).json({
        status: "success",
        message: "There is no role for this user.",
        has_role: false
      });
    }

    return res.status(200).json({
      status: "success",
      message: "User role is already set.",
      has_role: true,
      role
    });
 } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function getAllById(req: any, res: Response) {
  try {
    const user = await UserService.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Cannot find user with this ID."
      });
    }

    const data = user.toJSON();
    data.hasPassword = await UserService.hasPassword(req.user._id);

    return res.status(200).json({
      status: "success",
      message: "Fetch user successfully.",
      data
    })
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function getAttendeesByNameOrEmail(req: any, res: Response) {
  try {
    const raw = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    if (raw.length < MIN_ATTENDEE_SEARCH_LENGTH) {
      return res.status(200).json({
        status: "success",
        message: "Enter at least 2 characters to search.",
        data: []
      });
    }

    const attendees = await UserService.findAttendeesByNameOrEmail(raw, page);

    const data = attendees.map((attendee: any) => ({
      _id: attendee._id,
      name: attendee.name,
      profile: attendee.profile ?? null,
      email: maskEmail(attendee.email)
    }));

    return res.status(200).json({
      status: "success",
      message: "Fetch attendees successfully.",
      data
    })
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function update(req: any, res: Response) {
  try {    
    if(isRequestInvalid(req, res)) return;

    if (!verifyImageFile(req.file)) {
      return res.status(415).json({
        status: "error",
        message: "The profile photo must be a valid JPEG, PNG, or WebP image.",
      });
    }

    const filename = req.file?.filename;

    const data: { name: string; profile?: string } = { name: req.body.name };
    if (filename) data.profile = filename;

    const updated = await UserService.update(req.user._id, data);

    if (!updated) {
      return res.status(500).json({
        status: "error",
        message: "Cannot update user."
      });
    }

    if (filename && updated.profile && updated.profile !== filename) {
      removeUpload(updated.profile, "profiles");
    }

    return res.status(200).json({
      status: "success",
      message: "Update user successfully.",
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function updatePassword(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const user = await UserService.findByEmail(req.user.email);

    if (!user || !user.password) {
      return res.status(400).json({
        status: "error",
        message: "This account uses social login and has no password."
      });
    }

    const isCurrentPasswordCorrect = await comparePassword(req.body.current_password, user.password);

    if(!isCurrentPasswordCorrect) {
      return res.status(400).json({
        status: "error",
        message: "Current password is not correct."
      });
    }

    if (await comparePassword(req.body.new_password, user.password)) {
      return res.status(400).json({
        status: "error",
        message: "Choose a password you haven't used on this account before."
      });
    }

    const hash = await hashPassword(req.body.new_password);
    const updated = await UserService.updatePassword(req.user._id, hash);

    if (!updated) {
      return res.status(500).json({
        status: "error",
        message: "Cannot update password."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Update password successfully.",
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}