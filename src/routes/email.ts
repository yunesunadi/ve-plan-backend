import express from "express";
const router = express.Router();
const EmailController = require("../controllers/EmailController");
const jwtAuth = require("../middlewares/jwtAuth");
const organizerAuth = require("../middlewares/organizerAuth");

router.post("/", jwtAuth, organizerAuth, EmailController.send);

module.exports = router;