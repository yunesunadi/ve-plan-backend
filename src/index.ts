import express, { Request, Response } from "express";
import { createServer } from "http";
const app = express();
const server = createServer(app);
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const eventRouter = require("./routes/event");
const sessionRouter = require("./routes/session");
const eventRegisterRouter = require("./routes/event_register");
const emailRouter = require("./routes/email");
const eventInviteRouter = require("./routes/event_invite");
const meetingRouter = require("./routes/meeting");
const participantRouter = require("./routes/participant");
const notificationRouter = require("./routes/notification");

require("dotenv").config();
require("./libs/connectdb");
require("./libs/passport");

const socket = require("./libs/socket");
socket.initializeSocket(server);

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};
const PORT = process.env.PORT || 5000;
const PREFIX = "/api/v1";

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(PREFIX + "/static", express.static(path.join(__dirname, "../dist/photos")));

app.use(PREFIX + "/auth", authRouter);
app.use(PREFIX + "/user", userRouter);
app.use(PREFIX + "/events", eventRouter);
app.use(PREFIX + "/sessions", sessionRouter);
app.use(PREFIX + "/event_registers", eventRegisterRouter);
app.use(PREFIX + "/emails", emailRouter);
app.use(PREFIX + "/event_invites", eventInviteRouter);
app.use(PREFIX + "/meetings", meetingRouter);
app.use(PREFIX + "/participants", participantRouter);
app.use(PREFIX + "/notifications", notificationRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Page not found." });
});

server.listen(PORT, () => {
  console.log(`Server is listening at port ${PORT}...`);
});
