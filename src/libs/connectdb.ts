import mongoose from "mongoose";

require("dotenv").config();

mongoose.connect(`${process.env.DB_URL}`)
  .then(() => {
    console.log("Database is connected successfully.");
  })
  .catch((err) => {
    console.log("Someting went wrong in database connection.", err);
  });