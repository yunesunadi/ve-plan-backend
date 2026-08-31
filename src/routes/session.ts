import express from "express";
import { body } from "express-validator";
import { objectIdParam, handleValidation } from "../helpers/validate";
const router = express.Router();
const SessionController = require("../controllers/SessionController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const sessionOwnerAuth = require("../middlewares/sessionOwnerAuth");

const title_validation = body("title", "Title is required.").trim().notEmpty().bail()
  .isLength({ min: 3, max: 140 }).withMessage("Title must be 3–140 characters.");

const time_validation = [
  body("start_time", "Start time is required.").notEmpty().bail()
    .isISO8601().withMessage("Start time must be a valid time."),
  body("end_time", "End time is required.").notEmpty().bail()
    .isISO8601().withMessage("End time must be a valid time."),
];

const create_validation = [
  title_validation,
  ...time_validation,
  body("event", "Event id is required.").notEmpty().bail()
    .isMongoId().withMessage("Invalid event id."),
];

const update_validation = [title_validation, ...time_validation];

router.post("/", create_validation, jwtAuth, organizerAuth, SessionController.create);
router.get("/", jwtAuth, SessionController.getAll);
router.get("/:id", objectIdParam("id", "session"), handleValidation, jwtAuth, SessionController.getOneById);
router.put("/:id", update_validation, jwtAuth, organizerAuth, sessionOwnerAuth, SessionController.update);
router.delete("/:id", jwtAuth, organizerAuth, sessionOwnerAuth, SessionController.deleteOne);

export default router;
