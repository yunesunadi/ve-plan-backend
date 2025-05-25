import express from "express";
import { body } from "express-validator";
const router = express.Router();
const ParticipantController = require("../controllers/ParticipantController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const attendeeAuth = require("../middlewares/attendeeAuth");

const create_validation = [
  body("event", "Event ID is required.").notEmpty(),
  body("room_name", "Room name is required.").notEmpty(),
  body("start_time", "Start time is required.").notEmpty(),
];

const update_validation = [
  body("end_time", "End time is required.").notEmpty(),
];

router.post("/", create_validation, jwtAuth, attendeeAuth, ParticipantController.create);
router.put("/:id", update_validation, jwtAuth, attendeeAuth, ParticipantController.update);
router.get("/:id", jwtAuth, organizerAuth, ParticipantController.getAll);
router.get("/:id/stay_times", jwtAuth, organizerAuth, ParticipantController.getStayTimes);

module.exports = router;