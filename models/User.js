const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: { type: String, required: true, unique: true },
  account: {
    username: { type: String, required: true, unique: true },
    name: String,
    description: String,
    photo: Object,
  },
  token: String,
  hash: String,
  salt: String,
  rooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
  ],
});

module.exports = User;
