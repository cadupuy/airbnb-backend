require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const formidable = require("express-formidable");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const helmet = require("helmet");

const app = express();
app.use(formidable());
app.use(cors());
app.use(helmet());

// Cloudinary logs
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

const userRoutes = require("../routes/user");
app.use(userRoutes);
const roomRoutes = require("../routes/room");
app.use(roomRoutes);

app.all("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.listen(process.env.PORT, (req, res) => {
  console.log("Server started");
});
