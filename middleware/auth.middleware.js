
import jwt from "jsonwebtoken"
import User from "../models/User.model.js";

export const protectRoutes = async(req,res,next)=>{
  try {
    const token = req.cookies.chat_jwt


    if(!token){
      return res.status(401).json({msg: "Unauthorized - No Token Provided" });
    }

    const decode = await jwt.verify(token,process.env.JWT_SECRET);

    if(!decode){
      return res.status(401).json({msg: "Unauthorized - Invalid Token" });
    }

    const user = await User.findById(decode.userId).select('-password');

    if(!user){
      return res.status(404).json({msg: "User not found" });
    }

    req.user = user

    next()

  } catch (error) {
    console.log("Error in auth middleware")
    return res.status(500).json({msg: error.message});
  }
}