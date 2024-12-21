import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const OrganizerService = require("../services/OrganizerService");
const AttendeeService = require("../services/AttendeeService");

export async function register(req: Request, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(req.body.password, salt);
    let user;

    if(req.body.role === "organizer") {
      user = await OrganizerService.create({
        name: req.body.name,
        email: req.body.email,
        password: hash,
        role: req.body.role,
      });
    }

    if(req.body.role === "attendee") {
      user = await AttendeeService.create({
        name: req.body.name,
        email: req.body.email,
        password: hash,
        role: req.body.role,
      });
    }

    return res.status(201).json({
      status: "success",
      message: "User is created successfully.",
      data: user
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

    const role = req.body.role;
    const email = req.body.email;
    const password = req.body.password;
    let user;

    if(role === "organizer") {
      user = await OrganizerService.findByEmail(email);
    }

    if(role === "attendee") {
      user = await AttendeeService.findByEmail(email);
    }

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

    delete user.password;
    const token = jwt.sign(user.toJSON(), `${process.env.JWT_SECRET}`, { expiresIn: "14d" });
    
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