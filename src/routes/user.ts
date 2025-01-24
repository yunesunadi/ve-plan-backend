import express from "express";
const router = express.Router();
const UserController = require("../controllers/UserController");
const jwtAuth = require("../middlewares/jwtAuth");

router.get("/has_role", jwtAuth, UserController.hasRole);
router.get("/:id", jwtAuth, UserController.getAllById);

module.exports = router;