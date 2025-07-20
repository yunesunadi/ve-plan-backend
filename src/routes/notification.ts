import express from "express";
const router = express.Router();
const NotificationController = require("../controllers/NotificationController");
const jwtAuth = require("../middlewares/jwtAuth");

router.get("/", jwtAuth, NotificationController.getUserNotifications);
router.get("/unread_count", jwtAuth, NotificationController.getUnreadCount);
router.post("/mark_as_read", jwtAuth, NotificationController.markAsRead);
router.delete("/", jwtAuth, NotificationController.deleteNotifications);

module.exports = router;