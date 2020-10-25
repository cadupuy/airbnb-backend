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
    const filter = {};
    const numberOfResults = 5;
    let sort = {};
    let page = 0;

    if (req.query.page) {
      if (req.query.page <= 1) {
        page = 0;
      } else {
        page = req.query.page * numberOfResults - numberOfResults;
      }
    }
    if (req.query.title) {
      filter.title = new RegExp(req.query.title, "i");
    }
    if (req.query.priceMin && req.query.priceMax) {
      filter.price = {
        $gte: req.query.priceMin,
        $lte: req.query.priceMax,
      };
    } else if (req.query.priceMin) {
      filter.price = {
        $gte: req.query.priceMin,
      };
    } else if (req.query.priceMax) {
      filter.price = {
        $lte: req.query.priceMax,
      };
    }

    if (req.query.sort) {
      if (req.query.sort === "price-asc") {
        sort.price = 1;
      } else {
        sort.price = -1;
      }
    }
    const rooms = await Room.find(filter, { description: false })
      .populate({
        path: "user",
        select: "account",
      })
      .limit(numberOfResults)
      .skip(page)
      .sort(sort);

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

router.put("/room/upload_picture/:id", isAuthenticated, async (req, res) => {
  try {
    if (req.params.id) {
      const room = await Room.findById(req.params.id);
      if (room) {
        if (String(room.user) === String(req.user.id)) {
          if (req.files.photo) {
            if (room.photos.length < 5) {
              let pictureRoom = {};
              const pictureToUpload = req.files.photo.path;
              const pictureCloudinary = await cloudinary.uploader.upload(
                pictureToUpload,
                {
                  folder: "/airbnb/" + req.params.id,
                }
              );
              pictureRoom.url = pictureCloudinary.secure_url;
              pictureRoom.picture_id = pictureCloudinary.public_id;
              room.photos.push(pictureRoom);

              await room.save();
              res.status(200).json(room);
            } else {
              res.status(400).json({
                message: "Can't add more than 5 pictures",
              });
            }
          } else {
            res.status(400).json({
              message: "Missing photo",
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
        message: "Missing room id",
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
      if (!room) {
        res.status(400).json({
          message: "Room not found",
        });
      } else {
        if (String(room.user) === String(req.user.id)) {
          if (!req.fields.picture_id) {
            res.status(400).json({
              message: "Missing parameter",
            });
          } else {
            for (let i = 0; i < room.photos.length; i++) {
              if (room.photos[i].picture_id === req.fields.picture_id) {
                await cloudinary.uploader.destroy(room.photos[i].picture_id);
                room.photos.splice(i, 1);
                await room.save();
                return res.status(200).json({
                  message: "Picture deleted",
                });
              }
            }
            return res.status(400).json({
              message: "Picture not found",
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
        message: "Missing Room Id",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
