import bcrypt from "bcrypt"
import User from "../models/User.model.js"
import { generateWebToken } from "../lib/utils.js"

export const signup = async(req,res)=>{

  try {
    const {username,email,password} = req.body
    const avatar = req.file ?  req.file.path : "uploads/auth/default-avatar.png";
    if(password.length < 6){
      return res.status(400).json({msg: "password must be more than or equel 6 charcter"})
    }

    if(!username || !email || !password){
      return res.status(400).json({msg: "please provied all credentials"})
    }
    const user = await User.findOne({username})

    if(user) return res.status(400).json({msg: "User is already exsit"});

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);

    const newUser = new User({
      username,
      email,
      avatar,
      password : hashedPassword
    })

    generateWebToken(newUser._id,res);
    await newUser.save();

    return res.status(201).json({msg:"User is signed up",user: {
      username,
      email
    }})
    
  } catch (error) {
    console.log("Error in AuthController")
    return res.status(500).json({msg: error.message});
  }
}

export const login = async(req,res)=>{
  const {username,password} = req.body

  try {
    
    const user = await User.findOne({username})

    if(!user) return res.status(400).json({msg: "User is not exsit"});

    const isPasswordCorrect =await bcrypt.compare(password,user.password)

    if(!isPasswordCorrect){
      return res.status(400).json({msg: "Wrong credentials"});
    }

    generateWebToken(user._id,res);

    return res.status(200).json({msg: "You loged in",user})

  } catch (error) {
    console.log("Error in AuthController")
    return res.status(500).json({msg: error.message});
  }
}

export const logout = async(req,res)=>{
  try {
    res.cookie("chat_jwt","",{maxAge: 0 })
    return res.status(200).json({msg: "You loged out"})
  } catch (error) {
    console.log("Error in AuthController")
    return res.status(500).json({msg: error.message});
  }
}