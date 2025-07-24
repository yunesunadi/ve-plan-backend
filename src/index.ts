import express, { Request, Response } from "express";
import { createServer } from "http";
const app = express();
const server = createServer(app);
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import authRouter from "./routes/auth";
import userRouter from "./routes/user";
import eventRouter from "./routes/event";
import sessionRouter from "./routes/session";
import eventRegisterRouter from "./routes/event_register";
import emailRouter from "./routes/email";
import eventInviteRouter from "./routes/event_invite";
import meetingRouter from "./routes/meeting";
import participantRouter from "./routes/participant";
import notificationRouter from "./routes/notification";

require("dotenv").config();
require("./libs/connectdb");
require("./libs/passport");

import * as socket from "./libs/socket";
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
