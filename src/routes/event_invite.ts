import express from "express";
import { body } from "express-validator";
const router = express.Router();
const EventInviteController = require("../controllers/EventInviteController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const attendeeAuth = require("../middlewares/attendeeAuth");
const eventOwnerAuth = require("../middlewares/eventOwnerAuth");

const invite_validation = [
  body("user_id_list").isArray({ min: 1, max: 200 })
    .withMessage("Select between 1 and 200 attendees to invite."),
  body("user_id_list.*").isMongoId().withMessage("Invalid user id in list."),
  body("event_id", "Event ID is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

const accept_validation = [
  body("event_id", "Event ID is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

const start_meeting_validation = [
  body("user_id_list", "User ID list is required.").isArray({ min: 1 }),
  body("event_id", "Event ID is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

router.post("/", invite_validation, jwtAuth, organizerAuth, EventInviteController.invite);
router.get("/events", jwtAuth, attendeeAuth, EventInviteController.getAllByUserId);
router.get("/accepted_events", jwtAuth, attendeeAuth, EventInviteController.getAllAcceptedByUserId);
router.get("/:id/users", jwtAuth, organizerAuth, eventOwnerAuth, EventInviteController.getAllByEventId);
router.get("/:id/accepted_users", jwtAuth, organizerAuth, eventOwnerAuth, EventInviteController.getAllAcceptedByEventId);
router.put("/accept", accept_validation, jwtAuth, attendeeAuth, EventInviteController.acceptInvite);
router.put("/meeting_started", start_meeting_validation, jwtAuth, organizerAuth, EventInviteController.startMeeting);

export default router;