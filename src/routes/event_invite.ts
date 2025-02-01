import express from "express";
import { body } from "express-validator";
const router = express.Router();
const EventInviteController = require("../controllers/EventInviteController");
const jwtAuth = require("../middlewares/jwtAuth");

const invite_validation = [
  body("user_id", "User ID is required.").notEmpty(),
  body("event_id", "Event ID is required.").notEmpty(),
];

const accept_validation = [
  body("event_id", "Event ID is required.").notEmpty(),
];

router.post("/", invite_validation, jwtAuth, EventInviteController.invite);
router.get("/:id/users", jwtAuth, EventInviteController.getAll);
router.get("/:id/accepted_users", jwtAuth, EventInviteController.getAllAccepted);
router.put("/accept", accept_validation, jwtAuth, EventInviteController.acceptInvite);

module.exports = router;