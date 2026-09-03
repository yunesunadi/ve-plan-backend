import express from "express";
import { body } from "express-validator";
import { imageUpload } from "../helpers/uploads";
import { sensitiveActionLimiter } from "../middlewares/rateLimit";
import { PASSWORD_MIN_LENGTH, isCommonPassword } from "../helpers/password";
const router = express.Router();
const UserController = require("../controllers/UserController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");

const edit_profile_validation = [
  body("name", "Name is required.").trim().notEmpty().bail()
    .isLength({ min: 1, max: 80 }).withMessage("Name must be at most 80 characters."),
];

const update_password_validation = [
  body("current_password", "Current password is required.").notEmpty(),
  body("new_password", "New password is required.").notEmpty().bail()
    .isLength({ min: PASSWORD_MIN_LENGTH }).withMessage("New password must be at least 8 characters.").bail()
    .custom((v) => !isCommonPassword(v)).withMessage("This password is too common. Please choose a stronger one."),
];

const delete_account_validation = [
  body("password").optional().isString(),
  body("confirm_email").optional().isString(),
];

const profile_upload = imageUpload("profiles");

router.get("/has_role", jwtAuth, UserController.hasRole);
router.get("/", jwtAuth, UserController.getAllById);
router.put("/", jwtAuth, profile_upload.single("profile"), edit_profile_validation, UserController.update);
router.put("/password", jwtAuth, update_password_validation, UserController.updatePassword);
router.delete("/", sensitiveActionLimiter, delete_account_validation, jwtAuth, UserController.deleteAccount);
router.get("/attendees", jwtAuth, organizerAuth, UserController.getAttendeesByNameOrEmail);

export default router;
