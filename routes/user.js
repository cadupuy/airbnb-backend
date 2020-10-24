const express = require("express");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const router = express.Router();

const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
  try {
    const { password, username, email, description } = req.fields;

    if (!password || !username || !email || !description) {
      res.status(400).json({
        message: "Missing parameter",
      });
    } else {
      const userEmail = await User.findOne({ email: email });
      const userUsername = await User.findOne({ "account.username": username });

      if (userEmail) {
        res.status(400).json({
          message: "This email already has an account",
        });
      } else if (userUsername) {
        res.status(400).json({
          message: "This username already has an account",
        });
      } else {
        const salt = uid2(16);
        const hash = SHA256(password + salt).toString(encBase64);
        const user = new User({
          email,
          account: {
            username,
            description,
          },
          token: uid2(16),
          hash,
          salt,
        });
        await user.save();
        res.status(200).json({
          _id: user._id,
          email: user.email,
          account: user.account,
          token: user.token,
        });
      }
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const { password, email } = req.fields;
    const user = await User.findOne({ email: email });

    if (!password || !email) {
      res.status(400).json({
        message: "Missing parameter",
      });
    } else {
      if (!user) {
        res.status(400).json({
          message: "This account does not exist",
        });
      } else if (
        // Comparing Hash in DB to the result of password req.fields + salt in DB
        user.hash === SHA256(password + user.salt).toString(encBase64)
      ) {
        res.status(200).json({
          _id: user._id,
          email: user.email,
          account: user.account,
          token: user.token,
        });
      } else {
        res.status(401).json({
          message: "Unauthorized",
        });
      }
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
