import express from "express";
import { body } from "express-validator";
const router = express.Router();
const MeetingController = require("../controllers/MeetingController");
const jwtAuth = require("../middlewares/jwtAuth");

const create_validation = [
  body("event", "Event ID is required.").notEmpty(),
  body("room_name", "Room name is required.").notEmpty(),
  body("token", "Token is required.").notEmpty(),
];

router.post("/", create_validation, jwtAuth, MeetingController.create);
router.post("/token", jwtAuth, MeetingController.createToken);
router.get("/:id/is_created", jwtAuth, MeetingController.isCreated);
router.get("/:id/is_started", jwtAuth, MeetingController.isStarted);
router.get("/:id/attendee", jwtAuth, MeetingController.getOneByEventId);
router.get("/:id", jwtAuth, MeetingController.getOneById);

module.exports = router;