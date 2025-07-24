import express from "express";
import { body } from "express-validator";
const router = express.Router();
const EventRegisterController = require("../controllers/EventRegisterController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const attendeeAuth = require("../middlewares/attendeeAuth");

const register_validation = [
  body("event_id", "Event ID is required.").notEmpty(),
];

const approve_validation = [
  body("user_id", "User ID is required.").notEmpty(),
  body("event_id", "Event ID is required.").notEmpty(),
];

router.post("/", register_validation, jwtAuth, attendeeAuth, EventRegisterController.register);
router.delete("/:id", jwtAuth, attendeeAuth, EventRegisterController.unregister);
router.get("/events/approved", jwtAuth, attendeeAuth, EventRegisterController.getAllApprovedByUserId);
router.get("/events", jwtAuth, attendeeAuth, EventRegisterController.getAllByUserId);
router.get("/:id/approved", jwtAuth, attendeeAuth, EventRegisterController.isRegisterApproved);
router.get("/:id/users/approved", jwtAuth, organizerAuth, EventRegisterController.getAllApprovedByEventId);
router.get("/:id/users", jwtAuth, organizerAuth, EventRegisterController.getAllByEventId);
router.get("/:id", jwtAuth, attendeeAuth, EventRegisterController.hasRegistered);
router.put("/approve", approve_validation, jwtAuth, organizerAuth, EventRegisterController.approveRegister);
router.put("/meeting_started", approve_validation, jwtAuth, organizerAuth, EventRegisterController.startMeeting);

export default router;