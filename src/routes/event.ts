import express from "express";
import { body } from "express-validator";
import { imageUpload } from "../helpers/uploads";
import { objectIdParam, handleValidation } from "../helpers/validate";
const router = express.Router();
const EventController = require("../controllers/EventController");
const SessionController = require("../controllers/SessionController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const eventOwnerAuth = require("../middlewares/eventOwnerAuth");

const create_validation = [
  body("title", "Title is required.").trim().notEmpty().bail()
    .isLength({ min: 3, max: 140 }).withMessage("Title must be 3–140 characters."),
  body("description", "Description is required.").trim().notEmpty().bail()
    .isLength({ min: 1, max: 5000 }).withMessage("Description must be at most 5000 characters."),
  body("date", "Date is required.").notEmpty().bail()
    .isISO8601().withMessage("Date must be a valid date."),
  body("start_time", "Start time is required.").notEmpty().bail()
    .isISO8601().withMessage("Start time must be a valid time."),
  body("end_time", "End time is required.").notEmpty().bail()
    .isISO8601().withMessage("End time must be a valid time."),
  body("timezone").optional({ values: "falsy" }).isString()
    .withMessage("Timezone must be a string.").bail()
    .isLength({ max: 64 }).withMessage("Timezone is too long."),
  body("category", "Category is required.").isIn(["conference", "meetup", "webinar"])
    .withMessage("Category must be conference, meetup, or webinar."),
  body("type", "Type is required.").isIn(["public", "private"])
    .withMessage("Type must be public or private."),
];

const cover_upload = imageUpload("covers");

router.post("/", cover_upload.single("cover"), create_validation, jwtAuth, organizerAuth, EventController.create);
router.get("/events_by_query", jwtAuth, EventController.getAllByQuery);
router.get("/own", jwtAuth, organizerAuth, EventController.getMyEvents);
router.get("/", jwtAuth, EventController.getAll);
router.get("/:id", jwtAuth, EventController.getOneById);
router.get("/:id/sessions", objectIdParam("id", "event"), handleValidation, jwtAuth, SessionController.getForEvent);
router.put("/:id", cover_upload.single("cover"), create_validation, jwtAuth, organizerAuth, eventOwnerAuth, EventController.update);
router.delete("/:id", jwtAuth, organizerAuth, eventOwnerAuth, EventController.deleteOne);

export default router;