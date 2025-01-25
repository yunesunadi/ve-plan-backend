import express from "express";
import { body } from "express-validator";
const router = express.Router();
const SessionController = require("../controllers/SessionController");
const jwtAuth = require("../middlewares/jwtAuth");

const create_validation = [
  body("title", "Title is required.").notEmpty(),
  body("description", "Description is required.").notEmpty(),
  body("start_time", "Start time is required.").notEmpty(),
  body("end_time", "End time is required.").notEmpty(),
  body("event", "Event ID is required.").notEmpty(),
];

router.post("/", create_validation, jwtAuth, SessionController.create);
router.get("/", jwtAuth, SessionController.getAll);

module.exports = router;