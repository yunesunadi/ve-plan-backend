import express from "express";
import { body } from "express-validator";
const router = express.Router();
const SessionController = require("../controllers/SessionController");
const jwtAuth = require("../middlewares/jwtAuth");

const create_validation = [
  body("title", "Title is required.").notEmpty(),
  body("start_time", "Start time is required.").notEmpty(),
  body("end_time", "End time is required.").notEmpty(),
  body("event", "Event ID is required.").notEmpty(),
];

router.post("/", create_validation, jwtAuth, SessionController.create);
router.get("/", jwtAuth, SessionController.getAll);
router.get("/:id", jwtAuth, SessionController.getOneById);
router.put("/:id", create_validation, jwtAuth, SessionController.update);
router.delete("/:id", jwtAuth, SessionController.deleteOne);

module.exports = router;