import express from "express";
import { body } from "express-validator";
const router = express.Router();
const ParticipantController = require("../controllers/ParticipantController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const attendeeAuth = require("../middlewares/attendeeAuth");
const eventOwnerAuth = require("../middlewares/eventOwnerAuth");

const create_validation = [
  body("event", "Event id is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

const update_validation = [
  body("end_time", "End time is required.").notEmpty(),
];

router.post("/", create_validation, jwtAuth, attendeeAuth, ParticipantController.create);
router.put("/:id/no_end_time", jwtAuth, organizerAuth, eventOwnerAuth, ParticipantController.updateNoEndTime);
router.put("/:id", update_validation, jwtAuth, attendeeAuth, ParticipantController.update);
router.get("/:id", jwtAuth, organizerAuth, eventOwnerAuth, ParticipantController.getAll);
router.get("/:id/stay_times", jwtAuth, organizerAuth, eventOwnerAuth, ParticipantController.getStayTimes);

export default router;
