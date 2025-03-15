import express from "express";
import { body } from "express-validator";
import multer from "multer";
const router = express.Router();
const UserController = require("../controllers/UserController");
const jwtAuth = require("../middlewares/jwtAuth");

const edit_profile_validation = [
  body("name", "Name is required.").notEmpty(),
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
];

const profile_upload = multer({ dest: "dist/photos/profiles/"});

router.get("/has_role", jwtAuth, UserController.hasRole);
router.get("/", jwtAuth, UserController.getAllById);
router.put("/", jwtAuth, profile_upload.single("profile"), edit_profile_validation, UserController.update);
router.get("/attendees", jwtAuth, UserController.getAttendeesByNameOrEmail);

module.exports = router;