import express from "express";
const router = express.Router();
const EmailController = require("../controllers/EmailController");
const jwtAuth = require("../middlewares/jwtAuth");

router.post("/", jwtAuth, EmailController.send);

module.exports = router;