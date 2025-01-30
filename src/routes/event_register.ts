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
router.get("/:id", jwtAuth, EventRegisterController.hasRegistered);
router.get("/:id/users", jwtAuth, EventRegisterController.getAll);
router.put("/approve", approve_validation, jwtAuth, EventRegisterController.approveRegister);

module.exports = router;