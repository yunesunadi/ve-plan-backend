import express from "express";
import { body } from "express-validator";
const router = express.Router();
const MeetingController = require("../controllers/MeetingController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const attendeeAuth = require("../middlewares/attendeeAuth");

const create_validation = [
  body("event", "Event ID is required.").notEmpty(),
  body("room_name", "Room name is required.").notEmpty(),
  body("token", "Token is required.").notEmpty(),
];

const update_start_validation = [
  body("start_time", "Start time is required.").notEmpty(),
];

const update_end_validation = [
  body("end_time", "End time is required.").notEmpty(),
];

router.post("/", create_validation, jwtAuth, organizerAuth, MeetingController.create);
router.post("/token", jwtAuth, MeetingController.createToken);
router.get("/:id/is_created", jwtAuth, organizerAuth, MeetingController.isCreated);
router.get("/:id/is_started", jwtAuth, attendeeAuth, MeetingController.isStarted);
router.get("/:id/is_expired", jwtAuth, MeetingController.isExpired);
router.get("/:id/attendee", jwtAuth, attendeeAuth, MeetingController.getOneByEventId);
router.get("/:id", jwtAuth, organizerAuth, MeetingController.getOneById);
router.put("/:id/start_time", update_start_validation, jwtAuth, organizerAuth, MeetingController.updateStartTime);
router.put("/:id/end_time", update_end_validation, jwtAuth, organizerAuth, MeetingController.updateEndTime);

module.exports = router;