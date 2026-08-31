import express from "express";
import { body } from "express-validator";
import { objectIdParam, handleValidation } from "../helpers/validate";
const router = express.Router();
const EventRegisterController = require("../controllers/EventRegisterController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const attendeeAuth = require("../middlewares/attendeeAuth");
const eventOwnerAuth = require("../middlewares/eventOwnerAuth");

const register_validation = [
  body("event_id", "Event ID is required.").notEmpty(),
];

const approve_validation = [
  body("user_id_list", "User id list is required.").isArray({ min: 1 }),
  body("event_id", "Event id is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

const start_meeting_validation = [
  body("user_id_list", "User ID list is required.").isArray({ min: 1 }),
  body("event_id", "Event ID is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

router.post("/", register_validation, jwtAuth, attendeeAuth, EventRegisterController.register);
router.delete("/:id", objectIdParam("id", "event"), handleValidation, jwtAuth, attendeeAuth, EventRegisterController.unregister);
router.get("/events/approved", jwtAuth, attendeeAuth, EventRegisterController.getAllApprovedByUserId);
router.get("/events", jwtAuth, attendeeAuth, EventRegisterController.getAllByUserId);
router.get("/:id/approved", objectIdParam("id", "event"), handleValidation, jwtAuth, attendeeAuth, EventRegisterController.isRegisterApproved);
router.get("/:id/users/approved", jwtAuth, organizerAuth, eventOwnerAuth, EventRegisterController.getAllApprovedByEventId);
router.get("/:id/users", jwtAuth, organizerAuth, eventOwnerAuth, EventRegisterController.getAllByEventId);
router.get("/:id", objectIdParam("id", "event"), handleValidation, jwtAuth, attendeeAuth, EventRegisterController.hasRegistered);
router.put("/approve", approve_validation, jwtAuth, organizerAuth, EventRegisterController.approveRegister);
router.put("/meeting_started", start_meeting_validation, jwtAuth, organizerAuth, EventRegisterController.startMeeting);

export default router;