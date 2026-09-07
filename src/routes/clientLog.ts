import express from "express";
import { body } from "express-validator";
import { clientErrorLimiter } from "../middlewares/rateLimit";
import softAuth from "../middlewares/softAuth";
const router = express.Router();
const ClientLogController = require("../controllers/ClientLogController");

const report_validation = [
  body("message", "message is required.").isString().trim().notEmpty(),
  body("stack").optional().isString(),
  body("url").optional().isString(),
  body("userAgent").optional().isString(),
];

router.post("/", clientErrorLimiter, softAuth, report_validation, ClientLogController.report);

export default router;
