import jwt from "jsonwebtoken";

export const generateWebToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("chat_jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    httpOnly: true, // prevent XSS attacks cross-site scripting attacks
    secure: true, // ✅ required for HTTPS
    sameSite: "none", // ✅ required for cross-origin
  });

  return token;
};
