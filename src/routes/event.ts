import express from "express";
import { body } from "express-validator";
import multer from "multer";
const router = express.Router();
const EventController = require("../controllers/EventController");
const jwtAuth = require("../middlewares/jwtAuth");

const create_validation = [
  body("title", "Title is required.").notEmpty(),
  body("description", "Description is required.").notEmpty(),
  body("date", "Date is required.").notEmpty(),
  body("start_time", "Start time is required.").notEmpty(),
  body("end_time", "End time is required.").notEmpty(),
  body("category", "Category is required.").notEmpty(),
  body("type", "Type is required.").notEmpty(),
];
  
const cover_upload = multer({ dest: "src/assets/photos/covers/"});

router.post("/", cover_upload.single("cover"), create_validation, jwtAuth, EventController.create);
router.get("/", jwtAuth, EventController.getAll);

module.exports = router;