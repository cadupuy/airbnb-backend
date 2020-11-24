const express = require("express");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
const mailgun_key = process.env.MAILGUN_API_KEY;
const mailgunDomain = process.env.MAILGUN_DOMAIN;
const mailgun = require("mailgun-js")({
  apiKey: mailgun_key,
  domain: mailgunDomain,
});

const router = express.Router();

const User = require("../models/User");
const Room = require("../models/Room");

const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/user/signup", async (req, res) => {
  try {
    const {
      password,
      username,
      email,
      description,
      name,
      confirmPassword,
    } = req.fields;

    if (!password || !username || !email || !description || !confirmPassword) {
      res.status(400).json({
        message: "Paramètre manquant",
      });
    } else {
      const userEmail = await User.findOne({ email: email });
      const userUsername = await User.findOne({ "account.username": username });

      if (userEmail) {
        res.status(400).json({
          message: "Cette adresse email est déjà utilisée",
        });
      } else if (userUsername) {
        res.status(400).json({
          message: "Ce nom d'utilisateur est déjà utilisé",
        });
      } else if (password !== confirmPassword) {
        res.status(400).json({
          message: "Les deux mots de passe doivent être identiques",
        });
      } else {
        const salt = uid2(16);
        const hash = SHA256(password + salt).toString(encBase64);
        const user = new User({
          email,
          account: {
            username,
            name,
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
          name: user.name,
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
        message: "Paramètre manquant",
      });
    } else {
      if (!user) {
        res.status(400).json({
          message: "Ce compte n'existe pas",
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
          message: "Nom d'utilisateur ou mot de passe erroné",
        });
      }
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    if (req.params.id) {
      const user = await User.findById(req.params.id);
      if (user) {
        res.status(400).json({
          _id: user._id,
          account: user.account,
          rooms: user.rooms,
        });
      } else {
        res.status(400).json({
          message: "User not found",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing user Id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.get("/user/rooms/:id", async (req, res) => {
  try {
    if (req.params.id) {
      const user = await User.findById(req.params.id).populate("rooms");
      if (user) {
        if (user.rooms.length > 0) {
          res.status(400).json(user.rooms);
        } else {
          res.status(400).json({
            message: "This user has no room",
          });
        }
      } else {
        res.status(400).json({
          message: "User not found",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing user Id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.put("/user/upload_picture/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(400).json({
          message: "User not found",
        });
      } else {
        if (String(user.id) === String(req.user.id)) {
          if (!req.files.photo) {
            res.status(400).json({
              message: "Missing photo",
            });
          } else {
            let pictureCloudinary;
            const pictureUser = {};
            const pictureToUpload = req.files.photo.path;
            if (!user.account.photo) {
              pictureCloudinary = await cloudinary.uploader.upload(
                pictureToUpload,
                {
                  folder: "/airbnb/" + req.params.id,
                }
              );
            } else {
              pictureCloudinary = await cloudinary.uploader.upload(
                pictureToUpload,
                {
                  public_id: user.account.photo.picture_id,
                  folder: "/airbnb/" + req.params.id,
                }
              );
            }
            pictureUser.url = pictureCloudinary.secure_url;
            pictureUser.picture_id = pictureCloudinary.public_id;
            user.account.photo = pictureUser;

            await user.save();
            res.status(200).json({
              _id: user._id,
              email: user.email,
              account: user.account,
              rooms: user.rooms,
            });
          }
        } else {
          res.status(400).json({
            message: "Unauthorized",
          });
        }
      }
    } else {
      res.status(400).json({
        message: "Missing Id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.put("/user/delete_picture/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(400).json({
          message: "User not found",
        });
      } else {
        if (String(user.id) === String(req.user.id)) {
          if (!user.account.photo) {
            res.status(400).json({
              message: "No photo found",
            });
          } else {
            await cloudinary.uploader.destroy(user.account.photo.picture_id);
            user.account.photo = null;

            await user.save();
            res.status(200).json({
              _id: user._id,
              email: user.email,
              account: user.account,
              rooms: user.rooms,
            });
          }
        } else {
          res.status(400).json({
            message: "Unauthorized",
          });
        }
      }
    } else {
      res.status(400).json({
        message: "Missing Id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.put("/user/update/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const user = await User.findById(req.params.id);
      if (user) {
        if (String(req.user.id) === String(user.id)) {
          const { username, email, description, name } = req.fields;
          if (!username && !name && !email && !description) {
            res.status(400).json({
              message: "Missing parameter(s)",
            });
          } else {
            if (username) {
              const usernameSearch = await User.findOne({
                "account.username": username,
              });
              if (!usernameSearch) {
                user.account.username = username;
              } else {
                res.status(400).json({
                  message: "This username already has an account",
                });
              }
            }
            if (email) {
              const emailSearch = await User.findOne({
                email: email,
              });
              if (!emailSearch) {
                user.email = email;
              } else {
                res.status(400).json({
                  message: "This email already has an account",
                });
              }
            }
            if (description) {
              user.account.description = description;
            }
            if (name) {
              user.account.name = name;
            }

            await user.save();
            res.status(200).json({
              _id: user.id,
              email: user.email,
              account: user.account,
              rooms: user.rooms,
            });
          }
        } else {
          res.status(400).json({
            message: "Unauthorized",
          });
        }
      } else {
        res.status(400).json({
          message: "User not found",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing user id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.delete("/user/delete/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const user = await User.findById(req.params.id);
      if (user) {
        if (String(req.user.id) === String(user.id)) {
          await Room.find({ user: req.params.id }).deleteMany();
          await user.deleteOne();
          res.status(200).json({
            message: "User deleted",
          });
        } else {
          res.status(400).json({
            message: "Unauthorized",
          });
        }
      } else {
        res.status(400).json({
          message: "User not found",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing user id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
