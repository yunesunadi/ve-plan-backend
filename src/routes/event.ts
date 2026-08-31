import express from "express";
import { body } from "express-validator";
import { imageUpload } from "../helpers/uploads";
const router = express.Router();
const EventController = require("../controllers/EventController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");
const eventOwnerAuth = require("../middlewares/eventOwnerAuth");

const create_validation = [
  body("title", "Title is required.").notEmpty(),
  body("description", "Description is required.").notEmpty(),
  body("date", "Date is required.").notEmpty(),
  body("start_time", "Start time is required.").notEmpty(),
  body("end_time", "End time is required.").notEmpty(),
  body("category", "Category is required.").notEmpty(),
  body("type", "Type is required.").notEmpty(),
];

const cover_upload = imageUpload("covers");

router.post("/", cover_upload.single("cover"), create_validation, jwtAuth, organizerAuth, EventController.create);
router.get("/events_by_query", jwtAuth, EventController.getAllByQuery);
router.get("/own", jwtAuth, organizerAuth, EventController.getMyEvents);
router.get("/", jwtAuth, EventController.getAll);
router.get("/:id", jwtAuth, EventController.getOneById);
router.put("/:id", cover_upload.single("cover"), create_validation, jwtAuth, organizerAuth, eventOwnerAuth, EventController.update);
router.delete("/:id", jwtAuth, organizerAuth, eventOwnerAuth, EventController.deleteOne);

export default router;