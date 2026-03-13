import bcrypt from "bcrypt";
import User from "../models/User.model.js";
import { generateWebToken } from "../lib/utils.js";
import { uploadImages } from "../lib/uploadImages.js";

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let avatarUrl =
      "https://res.cloudinary.com/dwy8m1r5r/image/upload/v1749744855/auth_avatars/default_zogf9e.jpg";

    if (password.length < 6) {
      return res
        .status(400)
        .json({ msg: "password must be more than or equel 6 charcter" });
    }

    if (!username || !email || !password) {
      return res.status(400).json({ msg: "please provied all credentials" });
    }
    const user = await User.findOne({ username });

    if (user) return res.status(400).json({ msg: "User is already exsit" });

    if (req.file) {
      avatarUrl = await uploadImages(req, res, "auth", "image", username);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      avatar: avatarUrl,
      password: hashedPassword,
    });

    generateWebToken(newUser._id, res);
    await newUser.save();

    return res.status(201).json({
      msg: "User is signed up",
      user: {
        username,
        email,
      },
    });
  } catch (error) {
    console.log("Error in AuthController");
    return res.status(500).json({ msg: error.message });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) return res.status(400).json({ msg: "User is not exsit" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ msg: "Wrong credentials" });
    }

    user.status = "online";
    await user.save();

    generateWebToken(user._id, res);

    return res.status(200).json({ msg: "You loged in", user });
  } catch (error) {
    console.log("Error in AuthController");
    return res.status(500).json({ msg: error.message });
  }
};

export const logout = async (req, res) => {
  try {
     await User.findByIdAndUpdate(req.user._id, {
      status: 'offline',
    });
    res.cookie("chat_jwt", "", { maxAge: 0 });
    return res.status(200).json({ msg: "You loged out" });
  } catch (error) {
    console.log("Error in AuthController");
    return res.status(500).json({ msg: error.message });
  }
};

export const GetMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("servers", "_id name icon owner")
      .select("-password");

    
    return res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      servers: user.servers,
      roles: user.roles,
    });
  } catch (error) {
    console.log("Error in AuthController");
    return res.status(500).json({ msg: error.message });
  }
};
