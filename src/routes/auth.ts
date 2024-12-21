import express from "express";
import { body } from "express-validator";
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const jwtAuth = require("../middlewares/jwtAuth");

const register_validation = [
  body("name", "Name is required.").notEmpty(),
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
  body("password", "Password is required.").notEmpty(),
  body("password", "Password must be at least 6 characters.").isLength({ min: 6 }),
  body("role", "Role is required.").notEmpty(),
];

const login_validation = [
  body("email", "Email is required.").notEmpty(),
  body("email", "Invalid email.").isEmail(),
  body("password", "Password is required.").notEmpty(),
  body("role", "Role is required.").notEmpty(),
];

router.post("/register", register_validation, AuthController.register);
router.post("/login", login_validation, AuthController.login);
router.get("/verify", jwtAuth, AuthController.verify);

module.exports = router;