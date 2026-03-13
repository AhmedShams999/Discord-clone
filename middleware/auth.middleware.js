import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

const verifyToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId).select("-password");
  return user; // returns null if not found
};

export const protectRoutes = async (req, res, next) => {
  try {
    const token = req.cookies.chat_jwt;

    if (!token) {
      return res.status(401).json({ msg: "Unauthorized - No Token Provided" });
    }
    const user = await verifyToken(token);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Error in auth middleware");
    return res.status(500).json({ msg: error.message });
  }
};

export const protectSocket = async (socket, next) => {
  try {
    const cookies = socket.handshake.headers.cookie;

    if (!cookies) return next(new Error("Unauthorized - No Token Provided"));

    const parsedCookies = Object.fromEntries(
      cookies
        .split(";")
        .map((c) => c.trim().split("=").map(decodeURIComponent)),
    );

    const token = parsedCookies["chat_jwt"];

    if (!token) return next(new Error("Unauthorized - No Token Provided"));

    const user = await verifyToken(token);

    if (!user) return next(new Error("User not found"));

    socket.user = user; // ⭐ full user object available in socket
    socket.userId = user._id;
    next();
  } catch (error) {
    next(new Error(error.message));
  }
};
