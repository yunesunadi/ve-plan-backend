import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const UserService = require("../services/UserService");

export async function register(req: Request, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(req.body.password, salt);
    const filename = req.file?.filename;
    
    let user = await UserService.create({
      profile: filename,
      name: req.body.name,
      email: req.body.email,
      password: hash
    });

    user._id = user._id.toString();
    user = user.toJSON();
    delete user.password;
    const token = jwt.sign(user, `${process.env.JWT_SECRET}`, { expiresIn: "14d" });

    return res.status(201).json({
      status: "success",
      message: "Register successfully.",
      token
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

export async function login(req: Request, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const email = req.body.email;
    const password = req.body.password;

    let user = await UserService.findByEmail(email);

    if(!user) {
      return res.status(404).json({
        status: "error",
        message: "User with this email is not found."
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if(!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message: "Incorrect password."
      });
    }

    user._id = user._id.toString();
    user = user.toJSON();
    delete user.password;
    const token = jwt.sign(user, `${process.env.JWT_SECRET}`, { expiresIn: "14d" });
    
    return res.status(200).json({
      status: "success",
      message: "Login successfully.",
      token
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

export async function verify(req: any, res: any) {
  return res.status(200).json({
    status: "success",
    message: "Verified successfully."
  });
}

export async function role(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const user = await UserService.findById(req.user._id);

    if (user.role) {
      return res.status(403).json({
        status: "error",
        message: "User role is already set."
      });
    }
  
    const set_role = await UserService.setRole(req.user._id, req.body.role);
    
    if(!set_role) {
      return res.status(500).json({
        status: "error",
        message: "Cannot set role to user with this ID."
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Set role successfully."
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