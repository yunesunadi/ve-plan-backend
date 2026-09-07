import mongoose from "mongoose";
import logger from "../helpers/logger";

require("dotenv").config();

mongoose.connect(`${process.env.DB_URL}`)
  .then(() => {
    logger.info("database connected");
  })
  .catch((err) => {
    logger.fatal({ err }, "database connection failed");
    process.exit(1);
  });

export async function disconnectDb() {
  try {
    await mongoose.connection.close(false);
    logger.info("database connection closed");
  } catch (err) {
    logger.error({ err }, "error closing database connection");
  }
}
