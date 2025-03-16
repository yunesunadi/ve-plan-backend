import { Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import bcrypt from "bcrypt";
const UserService = require("../services/UserService");

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
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function getAllById(req: any, res: Response) {
  try {
    const user = await UserService.findById(req.user._id);

    if (!user) {
      return res.status(500).json({
        status: "error",
        message: "Cannot find user with this ID."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetch user successfully.",
      data: user
    })
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function getAttendeesByNameOrEmail(req: any, res: Response) {
  try {
    const attendees = await UserService.findAttendeesByNameOrEmail(req.query.search);

    if (attendees.length < 1) {
      return res.status(200).json({
        status: "success",
        message: "Cannot find attendees with this keyword."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Fetch attendees successfully.",
      data: attendees
    })
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function update(req: any, res: Response) {
  try {    
    if(isRequestInvalid(req, res)) return;

    const filename = req.file?.filename;
    const existed_user = await UserService.findByEmail(req.body.email);

    if (req.user.email !== req.body.email && existed_user) {
      return res.status(500).json({
        status: "error",
        message: "User with this email is already existed.",
      });
    }

    const updated = await UserService.update(
      req.user._id,
      {
        profile: filename,
        name: req.body.name,
        email: req.body.email,
      }
    );

    if (!updated) {
      return res.status(500).json({
        status: "error",
        message: "Cannot update user."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Update user successfully.",
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function updatePassword(req: any, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const user = await UserService.findByEmail(req.user.email);
    const isCurrentPasswordCorrect = await bcrypt.compare(req.body.current_password, user.password);
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(req.body.new_password, salt);

    if(!isCurrentPasswordCorrect) {
      return res.status(500).json({
        status: "error",
        message: "Current password is not correct."
      });
    }

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
      message: "Something went wrong.",
      error: err
    });
  }
}