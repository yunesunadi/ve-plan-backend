import express from "express";
import { body } from "express-validator";
const router = express.Router();
const SessionController = require("../controllers/SessionController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const sessionOwnerAuth = require("../middlewares/sessionOwnerAuth");

const create_validation = [
  body("title", "Title is required.").notEmpty(),
  body("start_time", "Start time is required.").notEmpty(),
  body("end_time", "End time is required.").notEmpty(),
  body("event", "Event id is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

const update_validation = [
  body("title", "Title is required.").notEmpty(),
  body("start_time", "Start time is required.").notEmpty(),
  body("end_time", "End time is required.").notEmpty(),
];

router.post("/", create_validation, jwtAuth, organizerAuth, SessionController.create);
router.get("/", jwtAuth, SessionController.getAll);
router.get("/:id", jwtAuth, SessionController.getOneById);
router.put("/:id", update_validation, jwtAuth, organizerAuth, sessionOwnerAuth, SessionController.update);
router.delete("/:id", jwtAuth, organizerAuth, sessionOwnerAuth, SessionController.deleteOne);

export default router;
