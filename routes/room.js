const express = require("express");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

const User = require("../models/User");
const Room = require("../models/Room");
const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/room/publish", isAuthenticated, async (req, res) => {
  try {
    const { title, location, price, description } = req.fields;

    if (!title || !location || !price || !description) {
      res.status(400).json({
        message: "Missing parameter",
      });
    } else {
      const room = new Room({
        title,
        location: [req.fields.location.lat, req.fields.location.lng],
        price,
        description,
        user: req.user,
      });
      await room.save();

      const user = await User.findById(req.user._id);
      user.rooms.push(room.id);
      await user.save();

      res.status(200).json(room);
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find({}, { description: false }).populate({
      path: "user",
      select: "account",
    });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.get("/rooms/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate({
      path: "user",
      select: "account",
    });
    if (req.params.id) {
      if (room) {
        res.status(200).json(room);
      } else {
        res.status(400).json({
          message: "Room not found",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing parameter",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: "Bad request",
    });
  }
});

router.put("/room/update/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const room = await Room.findById(req.params.id);
      if (room) {
        if (String(req.user.id) === String(room.user)) {
          const { title, description, price, location } = req.fields;

          if (!title && !description && !price && !location) {
            res.status(400).json({
              message: "You need to modify at least one element",
            });
          } else {
            if (title) {
              room.title = title;
            }
            if (description) {
              room.description = description;
            }
            if (price) {
              room.price = price;
            }
            if (location) {
              room.location = [
                req.fields.location.lat,
                req.fields.location.lng,
              ];
            }
            await room.save();
            res.status(200).json(room);
          }
        } else {
          res.status(400).json({
            message: "Unauthorized",
          });
        }
      } else {
        res.status(400).json({
          message: "Room not found",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing parameter",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.delete("/room/delete/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const room = await Room.findById(req.params.id);

      if (String(room.user) === String(req.user.id)) {
        if (room) {
          await room.deleteOne();
          const user = await User.findById(room.user._id);
          const position = user.rooms.indexOf(req.params.id);
          user.rooms.splice(position, 1);
          await user.save();
          res.status(200).json({
            message: "Room deleted",
          });
        } else {
          res.status(400).json({
            message: "Room not found",
          });
        }
      } else {
        res.status(401).json({
          message: "Unauthorized",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing parameter",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.put("/room/delete_picture/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const room = await Room.findById(req.params.id);
      if (room) {
        if (String(room.user.id) === String(req.user.id)) {
          if (room.photos) {
          } else {
            res.status(400).json({
              message: "Photo not found",
            });
          }
        } else {
          res.status(400).json({
            message: "Unauthorized",
          });
        }
      } else {
        res.status(400).json({
          message: "Room not found",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.put("/room/delete_picture/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const room = await Room.findById(req.params.id);
      if (room) {
        if (String(room.user.id) === String(req.user.id)) {
          if (room.photos) {
          } else {
            res.status(400).json({
              message: "Photo not found",
            });
          }
        } else {
          res.status(400).json({
            message: "Unauthorized",
          });
        }
      } else {
        res.status(400).json({
          message: "Room not found",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
