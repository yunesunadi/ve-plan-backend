import express from "express";
import crypto from "crypto";
import { body } from "express-validator";
import passport from "passport";
import { imageUpload } from "../helpers/uploads";
import { authLimiter, passwordResetLimiter } from "../middlewares/rateLimit";
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const jwtAuth = require("../middlewares/jwtAuth");

const register_validation = [
  body("name", "Name is required.").notEmpty(),
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
  body("password", "Password is required.").notEmpty(),
  body("password", "Password must be at least 6 characters.").isLength({ min: 6 }),
];

const login_validation = [
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
  body("password", "Password is required.").notEmpty(),
];

const role_validation = [
  body("role", "Role must be either organizer or attendee.").isIn(["organizer", "attendee"]),
];

const forgot_password_validation = [
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
];

const reset_password_validation = [
  body("password", "Password is required.").notEmpty(),
  body("password", "Password must be at least 6 characters.").isLength({ min: 6 }),
];

const facebook_token_validation = [
  body("access_token", "Facebook access token is required.").notEmpty(),
];

const email_only_validation = [
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
];

const profile_upload = imageUpload("profiles");

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const startOAuth = (provider: "google" | "facebook", scope: string[]) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const nonce = crypto.randomBytes(16).toString("hex");
    const client = req.query.client === "mobile" ? "mobile" : "web";

    res.cookie("oauth_state", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      signed: true,
      maxAge: OAUTH_STATE_TTL_MS,
    });

    const state = Buffer.from(JSON.stringify({ nonce, client })).toString("base64url");

    return passport.authenticate(provider, { scope, state })(req, res, next);
  };

router.post("/register", authLimiter, profile_upload.single("profile"), register_validation, AuthController.register);
router.post("/login", authLimiter, login_validation, AuthController.login);
router.post("/role", role_validation, jwtAuth, AuthController.role)
router.post("/verify_email", AuthController.verify);
router.post("/resend_verification", passwordResetLimiter, email_only_validation, AuthController.resendVerification);
router.post("/forgot_password", passwordResetLimiter, forgot_password_validation, AuthController.forgotPassword);
router.post("/reset_password", passwordResetLimiter, reset_password_validation, AuthController.resetPassword);
router.get("/google", startOAuth("google", ["profile", "email"]));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/login" }), AuthController.googleCallback);
router.get("/facebook", startOAuth("facebook", ["public_profile", "email"]));
router.get("/facebook/callback", passport.authenticate("facebook", { session: false, failureRedirect: "/login" }), AuthController.facebookCallback);
router.post("/facebook/token", authLimiter, facebook_token_validation, AuthController.facebookToken);

export default router;