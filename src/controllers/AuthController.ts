import { Request, Response } from "express";
import { isRequestInvalid } from "../helpers/utils";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
const UserService = require("../services/UserService");
const EmailService = require("../services/EmailService");

export async function register(req: Request, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(req.body.password, salt);
    const filename = req.file?.filename;

    const existed_user = await UserService.findByEmail(req.body.email);

    if (existed_user) {
      return res.status(409).json({
        status: "error",
        message: "User with this email is already existed.",
      });
    }
    
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let user = await UserService.create({
      profile: filename,
      name: req.body.name,
      email: req.body.email,
      password: hash,
      isVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    await EmailService.send({
      action: "email_verified",
      recipient: user.email,
      additional: {
        name: user.name,
        link: `${process.env.FRONTEND_URL}/verify_email?token=${verificationToken}`
      }
    });

    return res.status(201).json({
      status: "success",
      message: "Register successfully. Please check your email to verify your account."
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
    delete user.verificationToken;
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

export async function verify(req: any, res: Response) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Verification token is required."
      });
    }

    let user = await UserService.findByVerificationToken(token);

    if (!user) {
      return res.status(409).json({
        status: "error",
        message: "Invalid or expired verification token. Please register again or request a new verification email."
      });
    }

    user._id = user._id.toString();
    user = user.toJSON();
    delete user.password;
    delete user.verificationToken;

    const jwt_token = jwt.sign(user, `${process.env.JWT_SECRET}`, { expiresIn: "14d" });

    await UserService.verifyUser(user._id);

    return res.status(200).json({
      status: "success",
      message: "Email verified successfully. You can now log in.",
      token: jwt_token
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

export async function role(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    let user = await UserService.findById(req.user._id);

    if (user.role) {
      return res.status(409).json({
        status: "error",
        message: "User role is already set."
      });
    }
  
    const set_role = await UserService.setRole(req.user._id, req.body.role);
    
    if(!set_role) {
      return res.status(409).json({
        status: "error",
        message: "Cannot set role to user with this ID."
      });
    }

    user = await UserService.findById(req.user._id);
    user._id = user._id.toString();
    user = user.toJSON();
    delete user.password;
    delete user.verificationToken;

    const token = jwt.sign(user, `${process.env.JWT_SECRET}`, { expiresIn: "14d" });

    return res.status(200).json({
      status: "success",
      message: "Set role successfully.",
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

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required."
      });
    }

    const user = await UserService.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "No user found with this email."
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    await UserService.setResetPasswordToken(user._id, resetToken, resetTokenExpires);

    await EmailService.send({
      action: "reset_password",
      recipient: user.email,
      additional: {
        name: user.name,
        link: `${process.env.FRONTEND_URL}/reset_password?token=${resetToken}`
      }
    });
    return res.status(200).json({
      status: "success",
      message: "Sent password reset email successfully."
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

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token } = req.query;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Token is required."
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Password is required."
      });
    }

    const user = await UserService.findByResetPasswordToken(token);

    if (!user) {
      return res.status(409).json({
        status: "error",
        message: "Invalid or expired password reset token."
      });
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(password, salt);

    await UserService.updatePasswordAndClearReset(user._id, hash);

    return res.status(200).json({
      status: "success",
      message: "Password has been reset successfully."
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

export async function googleCallback(req: any, res: Response) {
  try {
    if (!req.user.token) {
      return res.status(401).json({
        status: "error",
        message: "Google authentication failed."
      });
    }

    return res.redirect(`${process.env.FRONTEND_URL}/social_login_redirect?token=${req.user.token}`);
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}

export async function facebookCallback(req: any, res: Response) {
  try {
    if (!req.user.token) {
      return res.status(401).json({
        status: "error",
        message: "Facebook authentication failed."
      });
    }

    return res.redirect(`${process.env.FRONTEND_URL}/social_login_redirect?token=${req.user.token}`);
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Something went wrong.",
      error: err
    });
  }
}
