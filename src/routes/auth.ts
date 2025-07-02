import express from "express";
import { body } from "express-validator";
import multer from "multer";
import passport from "passport";
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
  body("role", "Role is required.").notEmpty(),
];

const forgot_password_validation = [
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
];

const reset_password_validation = [
  body("password", "Password is required.").notEmpty(),
  body("password", "Password must be at least 6 characters.").isLength({ min: 6 }),
];

const profile_upload = multer({ dest: "dist/photos/profiles/"});

router.post("/register", profile_upload.single("profile"), register_validation, AuthController.register);
router.post("/login", login_validation, AuthController.login);
router.post("/role", role_validation, jwtAuth, AuthController.role)
router.post("/verify_email", AuthController.verify);
router.post("/forgot_password", forgot_password_validation, AuthController.forgotPassword);
router.post("/reset_password", reset_password_validation, AuthController.resetPassword);
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/login" }), AuthController.googleCallback);

module.exports = router;