const express = require("express");
const mongoose = require("mongoose");
const formidable = require("express-formidable");
const cors = require("cors");

const app = express();
app.use(formidable());
app.use(cors());

mongoose.connect("mongodb://localhost/airbnb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const userRoutes = require("./routes/user");
app.use(userRoutes);

app.all("*", (req, res) => {
  res.status(404).json({
    message: "Not found",
  });
});

app.listen("3000", (req, res) => {
  console.log("Server started");
});
