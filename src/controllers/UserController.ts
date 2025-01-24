import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
const UserService = require("../services/UserService");

export async function hasRole(req: any, res: Response) {
  try {
    const role = await UserService.getRole(req.user._id);
    
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