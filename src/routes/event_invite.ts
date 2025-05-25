import express from "express";
import { body } from "express-validator";
const router = express.Router();
const EventInviteController = require("../controllers/EventInviteController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const attendeeAuth = require("../middlewares/attendeeAuth");

const invite_validation = [
  body("user_id", "User ID is required.").notEmpty(),
  body("event_id", "Event ID is required.").notEmpty(),
];

const accept_validation = [
  body("event_id", "Event ID is required.").notEmpty(),
];

router.post("/", invite_validation, jwtAuth, organizerAuth, EventInviteController.invite);
router.get("/events", jwtAuth, attendeeAuth, EventInviteController.getAllByUserId);
router.get("/accepted_events", jwtAuth, attendeeAuth, EventInviteController.getAllAcceptedByUserId);
router.get("/:id/users", jwtAuth, organizerAuth, EventInviteController.getAllByEventId);
router.get("/:id/accepted_users", jwtAuth, organizerAuth, EventInviteController.getAllAcceptedByEventId);
router.put("/accept", accept_validation, jwtAuth, attendeeAuth, EventInviteController.acceptInvite);
router.put("/meeting_started", invite_validation, jwtAuth, organizerAuth, EventInviteController.startMeeting);

module.exports = router;