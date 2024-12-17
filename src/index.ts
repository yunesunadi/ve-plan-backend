import express, { Request, Response } from "express";
const app = express();
import cors from "cors";
import bodyParser from "body-parser";

require("dotenv").config();

const corsOptions = {
  origin: process.env.PROD_CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};
const port = process.env.PROD_PORT || 5000;

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req: Request, res: Response) => {
  res.send("<h1>Hello world</h1>");
});

app.listen(port, () => {
  console.log(`Server is listening at port ${port}...`);
});
