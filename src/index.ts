import express, { Request, Response } from "express";
const app = express();
import cors from "cors";
import bodyParser from "body-parser";
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const eventRouter = require("./routes/event");

require("dotenv").config();
require("./libs/connectdb");
require("./libs/passport");

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};
const PORT = process.env.PORT || 5000;
const PREFIX = "/api/v1";

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/static", express.static("./assets/photos/profiles"));

app.use(PREFIX + "/auth", authRouter);
app.use(PREFIX + "/user", userRouter);
app.use(PREFIX + "/events", eventRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Page not found." });
});

app.listen(PORT, () => {
  console.log(`Server is listening at port ${PORT}...`);
});
