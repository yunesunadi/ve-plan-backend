import express from "express";
import { body } from "express-validator";
import multer from "multer";
const router = express.Router();
const UserController = require("../controllers/UserController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");

const edit_profile_validation = [
  body("name", "Name is required.").notEmpty(),
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
];

const update_password_validation = [
  body("current_password", "Current password is required.").notEmpty(),
  body("current_password", "Current password must be at least 6 characters.").isLength({ min: 6 }),
  body("new_password", "New password is required.").notEmpty(),
  body("new_password", "New password must be at least 6 characters.").isLength({ min: 6 }),
];

const profile_upload = multer({ dest: "dist/photos/profiles/"});

router.get("/has_role", jwtAuth, UserController.hasRole);
router.get("/", jwtAuth, UserController.getAllById);
router.put("/", jwtAuth, profile_upload.single("profile"), edit_profile_validation, UserController.update);
router.put("/password", jwtAuth, update_password_validation, UserController.updatePassword);
router.get("/attendees", jwtAuth, organizerAuth, UserController.getAttendeesByNameOrEmail);

module.exports = router;