import { Request, Response } from "express";
import { isRequestInvalid, bestEffort } from "../helpers/utils";
import { verifyImageFile } from "../helpers/uploads";
import { hashPassword, comparePassword, dummyCompare } from "../helpers/password";
import { signAuthToken } from "../helpers/authToken";
import crypto from "crypto";
import * as UserService from "../services/UserService";
import { AccountLinkError } from "../services/UserService";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const GENERIC_LOGIN_ERROR = "Email or password is incorrect.";
import * as EmailService from "../services/EmailService";
import * as NotificationService from "../services/NotificationService";
import * as FacebookService from "../services/FacebookService";
import * as SocketService from "../libs/socket";

export async function register(req: Request, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    if (!verifyImageFile(req.file)) {
      return res.status(415).json({
        status: "error",
        message: "The uploaded file is not a valid JPEG, PNG, or WebP image.",
      });
    }

    const existed_user = await UserService.findByEmail(req.body.email);
    const hash = await hashPassword(req.body.password);
    const filename = req.file?.filename;
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

    if (existed_user) {
      const claimable =
        !existed_user.isVerified &&
        (!existed_user.verificationTokenExpires ||
          existed_user.verificationTokenExpires.getTime() < Date.now());

      if (!claimable) {
        return res.status(409).json({
          status: "error",
          message: "User with this email is already existed.",
        });
      }

      await UserService.replaceUnverified(existed_user._id, {
        name: req.body.name,
        password: hash,
        profile: filename,
        verificationToken,
        verificationTokenExpires,
      });

      await bestEffort("verification email (re-register)", () => EmailService.send({
        action: "email_verified",
        recipient: existed_user.email,
        additional: {
          name: req.body.name,
          link: `${process.env.FRONTEND_URL}/verify_email?token=${verificationToken}`
        }
      }));

      return res.status(201).json({
        status: "success",
        message: "Register successfully. Please check your email to verify your account."
      });
    }

    let user;

    try {
      user = await UserService.create({
        profile: filename,
        name: req.body.name,
        email: req.body.email,
        password: hash,
        isVerified: false,
        verificationToken,
        verificationTokenExpires
      });
    } catch (createErr: any) {
      if (createErr && createErr.code === 11000) {
        return res.status(409).json({
          status: "error",
          message: "User with this email is already existed.",
        });
      }
      throw createErr;
    }

    await bestEffort("verification email", () => EmailService.send({
      action: "email_verified",
      recipient: user.email,
      additional: {
        name: user.name,
        link: `${process.env.FRONTEND_URL}/verify_email?token=${verificationToken}`
      }
    }));

    return res.status(201).json({
      status: "success",
      message: "Register successfully. Please check your email to verify your account."
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    if(isRequestInvalid(req, res)) return;

    const email = req.body.email;
    const password = req.body.password;

    let user = await UserService.findByEmail(email);

    if (!user) {
      await dummyCompare(password);
      return res.status(401).json({ status: "error", message: GENERIC_LOGIN_ERROR });
    }

    if (!user.password) {
      await dummyCompare(password);
      return res.status(400).json({
        status: "error",
        message: "This account uses social login. Sign in with Google or Facebook."
      });
    }

    const isPasswordCorrect = await comparePassword(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ status: "error", message: GENERIC_LOGIN_ERROR });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        status: "error",
        message: "Please verify your email before logging in. Check your inbox or request a new link."
      });
    }

    const token = signAuthToken(user);

    return res.status(200).json({
      status: "success",
      message: "Login successfully.",
      token
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
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
      return res.status(400).json({
        status: "error",
        message: "This verification link is not valid."
      });
    }

    if (!user.isVerified) {
      const expired =
        user.verificationTokenExpires &&
        user.verificationTokenExpires.getTime() < Date.now();

      if (expired) {
        return res.status(410).json({
          status: "error",
          message: "This verification link has expired. Request a new one."
        });
      }

      await UserService.verifyUser(user._id);
    }

    user = await UserService.findById(user._id);

    const jwt_token = signAuthToken(user);

    return res.status(200).json({
      status: "success",
      message: "Email verified successfully. You can now log in.",
      token: jwt_token
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function role(req: any, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const set_role = await UserService.setRoleIfUnset(req.user._id, req.body.role);

    if (!set_role) {
      return res.status(409).json({
        status: "error",
        message: "User role is already set."
      });
    }

    const user: any = set_role;

    const token = signAuthToken(user);

    await bestEffort("registration welcome notification", () => NotificationService.sendRegistrationWelcome(user));

    return res.status(200).json({
      status: "success",
      message: "Set role successfully.",
      token
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const GENERIC = "If an account exists for that address, a password reset link has been sent.";

  try {
    if (isRequestInvalid(req, res)) return;

    const { email } = req.body;
    const user = await UserService.findByEmail(email);

    if (user && user.password) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);

      await UserService.setResetPasswordToken(user._id, resetToken, resetTokenExpires);

      await bestEffort("password reset email", () => EmailService.send({
        action: "reset_password",
        recipient: user.email,
        additional: {
          name: user.name,
          link: `${process.env.FRONTEND_URL}/reset_password?token=${resetToken}`
        }
      }));
    }

    return res.status(200).json({ status: "success", message: GENERIC });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
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

    const user = await UserService.findByResetPasswordToken(token as string);

    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "This password reset link is not valid."
      });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires.getTime() < Date.now()) {
      return res.status(410).json({
        status: "error",
        message: "This password reset link has expired. Request a new one."
      });
    }

    if (!user.password && (user.googleId || user.facebookId)) {
      return res.status(400).json({
        status: "error",
        message: "This account uses social login and has no password."
      });
    }

    if (user.password && await comparePassword(password, user.password)) {
      return res.status(400).json({
        status: "error",
        message: "Choose a password you haven't used on this account before."
      });
    }

    const hash = await hashPassword(password);

    await UserService.updatePasswordAndClearReset(user._id, hash);

    await bestEffort("revoke sessions after password reset", async () => SocketService.disconnectUser(user._id.toString()));

    return res.status(200).json({
      status: "success",
      message: "Password has been reset successfully."
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function resendVerification(req: Request, res: Response) {
  const GENERIC = "If that address needs verifying, a new link has been sent.";

  try {
    if (isRequestInvalid(req, res)) return;

    const user = await UserService.findUnverifiedByEmail(req.body.email);

    if (user) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpires = new Date(Date.now() + VERIFICATION_TTL_MS);

      await UserService.setVerificationToken(user._id, verificationToken, verificationTokenExpires);

      await bestEffort("verification email (resend)", () => EmailService.send({
        action: "email_verified",
        recipient: user.email,
        additional: {
          name: user.name,
          link: `${process.env.FRONTEND_URL}/verify_email?token=${verificationToken}`
        }
      }));
    }

    return res.status(200).json({ status: "success", message: GENERIC });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

type OAuthClient = "mobile" | "web";

function resolveOAuthState(req: any, res: Response): OAuthClient | null {
  const raw = typeof req.query.state === "string" ? req.query.state : "";
  let parsed: any;

  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    res.status(400).json({ status: "error", message: "Invalid OAuth state." });
    return null;
  }

  const cookieNonce = req.signedCookies?.oauth_state;

  if (!parsed || typeof parsed.nonce !== "string" || !cookieNonce || parsed.nonce !== cookieNonce) {
    res.status(400).json({ status: "error", message: "Invalid OAuth state." });
    return null;
  }

  res.clearCookie("oauth_state");
  return parsed.client === "mobile" ? "mobile" : "web";
}

export async function googleCallback(req: any, res: Response) {
  try {
    const client = resolveOAuthState(req, res);
    if (!client) return;

    if (!req.user.token) {
      return res.status(401).json({
        status: "error",
        message: "Google authentication failed."
      });
    }

    res.setHeader("Referrer-Policy", "no-referrer");
    return res.redirect(socialLoginRedirect(req.user.token, client));
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

export async function facebookCallback(req: any, res: Response) {
  try {
    const client = resolveOAuthState(req, res);
    if (!client) return;

    if (!req.user.token) {
      return res.status(401).json({
        status: "error",
        message: "Facebook authentication failed."
      });
    }

    res.setHeader("Referrer-Policy", "no-referrer");
    return res.redirect(socialLoginRedirect(req.user.token, client));
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}

function socialLoginRedirect(token: string, client: OAuthClient): string {
  return client === "mobile"
    ? `veplanauth://oauth?token=${token}`
    : `${process.env.FRONTEND_URL}/social_login_redirect?token=${token}`;
}

export async function facebookToken(req: Request, res: Response) {
  try {
    if (isRequestInvalid(req, res)) return;

    const result = await FacebookService.verifyAccessToken(req.body.access_token);

    if (!result.ok) {
      return res.status(401).json({
        status: "error",
        message: result.message,
      });
    }

    const { profile } = result;

    if (!profile.email) {
      return res.status(400).json({
        status: "error",
        message: "Your Facebook account has no email address. Add one to your Facebook account or sign up with email instead.",
      });
    }

    let user: any;
    try {
      user = await UserService.upsertFacebookUser({
        facebookId: profile.id,
        name: profile.name,
        email: profile.email,
        profile: profile.picture,
      });
    } catch (linkErr: any) {
      if (linkErr instanceof AccountLinkError) {
        return res.status(409).json({ status: "error", message: linkErr.message });
      }
      throw linkErr;
    }

    const token = signAuthToken(user);

    return res.status(200).json({
      status: "success",
      message: "Login successfully.",
      token,
    });
  } catch (err: any) {
    console.log("err", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong."
    });
  }
}
