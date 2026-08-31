import express from "express";
import { body, param } from "express-validator";
import { handleValidation } from "../helpers/validate";
const router = express.Router();
const MeetingController = require("../controllers/MeetingController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const attendeeAuth = require("../middlewares/attendeeAuth");
const meetingOwnerAuth = require("../middlewares/meetingOwnerAuth");

const create_validation = [
  body("event", "Event id is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

const token_validation = [
  body("event_id", "Event id is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

const event_id_param_validation = [
  param("id", "Invalid event id.").isMongoId(),
];

const update_start_validation = [
  param("id", "Invalid event id.").isMongoId(),
  body("start_time", "Start time is required.").notEmpty(),
];

const update_end_validation = [
  param("id", "Invalid event id.").isMongoId(),
  body("end_time", "End time is required.").notEmpty(),
];

router.post("/", create_validation, jwtAuth, organizerAuth, MeetingController.create);
router.post("/token", token_validation, jwtAuth, MeetingController.createToken);
router.get("/:id/is_created", event_id_param_validation, handleValidation, jwtAuth, organizerAuth, MeetingController.isCreated);
router.get("/:id/is_started", event_id_param_validation, handleValidation, jwtAuth, attendeeAuth, MeetingController.isStarted);
router.get("/:id/is_expired", event_id_param_validation, handleValidation, jwtAuth, MeetingController.isExpired);
router.get("/:id/attendee", event_id_param_validation, jwtAuth, attendeeAuth, MeetingController.getOneByEventId);
router.get("/:id", event_id_param_validation, jwtAuth, organizerAuth, meetingOwnerAuth, MeetingController.getOneById);
router.put("/:id/start_time", update_start_validation, jwtAuth, organizerAuth, meetingOwnerAuth, MeetingController.updateStartTime);
router.put("/:id/end_time", update_end_validation, jwtAuth, organizerAuth, meetingOwnerAuth, MeetingController.updateEndTime);
router.put("/:id/end", event_id_param_validation, jwtAuth, organizerAuth, meetingOwnerAuth, MeetingController.endMeeting);
router.put("/:id/reopen", event_id_param_validation, jwtAuth, organizerAuth, meetingOwnerAuth, MeetingController.reopenMeeting);

export default router;
