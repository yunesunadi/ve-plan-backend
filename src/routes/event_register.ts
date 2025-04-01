import express from "express";
import { body } from "express-validator";
const router = express.Router();
const EventRegisterController = require("../controllers/EventRegisterController");
const jwtAuth = require("../middlewares/jwtAuth");

const register_validation = [
  body("event_id", "Event ID is required.").notEmpty(),
];

const approve_validation = [
  body("user_id", "User ID is required.").notEmpty(),
  body("event_id", "Event ID is required.").notEmpty(),
];

router.post("/", register_validation, jwtAuth, EventRegisterController.register);
router.delete("/:id", jwtAuth, EventRegisterController.unregister);
router.get("/events", jwtAuth, EventRegisterController.getAllByUserId);
router.get("/:id/approved", jwtAuth, EventRegisterController.isRegisterApproved);
router.get("/:id/users/approved", jwtAuth, EventRegisterController.getAllApprovedByEventId);
router.get("/:id/users", jwtAuth, EventRegisterController.getAllByEventId);
router.get("/:id", jwtAuth, EventRegisterController.hasRegistered);
router.put("/approve", approve_validation, jwtAuth, EventRegisterController.approveRegister);
router.put("/meeting_started", approve_validation, jwtAuth, EventRegisterController.startMeeting);

module.exports = router;