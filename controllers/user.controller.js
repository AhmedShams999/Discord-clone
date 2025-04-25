import Channel from "../models/Channel.model.js"
import User from "../models/User.model.js"


export const sendFriendReq = async(req,res)=>{
  try {
    const {username} = req.body
    const user = req.user
    if(!username) return res.status(400).json({msg:"Please provied the username"})    
    
    if(user.username == username) return res.status(400).json({msg:"You can't send friend request to your self"}) 

    const recipient = await User.findOne({username})
    if(!recipient)  return res.status(404).json({msg:"No user found"}) 

    if(recipient.friends.includes(user._id)) return res.status(400).json({msg:"You are already friend with this user"}) 
    
    const sentFriendReq = user.friendRequests.outGoing.some(req=> req.to.toString() === recipient._id.toString()) || recipient.friendRequests.inComing.some(req=> req.from.toString() === user._id.toString())

    if(sentFriendReq){
      return res.status(400).json({msg:"A friend request already sent"}) 
    }

    user.friendRequests.outGoing.push({to: recipient._id})
    recipient.friendRequests.inComing.push({from: user._id})

    await Promise.all([user.save(),recipient.save()])

    return res.status(200).json({msg:"Friend request is sent"}) 
  } catch (error) {
    console.log("Error in userController")
    return res.status(500).json({msg: error.message});
  }
}

export const getAllReq = async(req,res)=>{
  try {
    const user = req.user
    const allReq = await User.findById(user._id)
      .populate('friends', 'username')
      .populate('friendRequests.inComing.from', 'username')
      .populate('friendRequests.outGoing.to', 'username'); 

    return res.status(200).json({msg:`All ${user.username} friends requests`,allReq})
  } catch (error) {
    console.log("Error in userController")
    return res.status(500).json({msg: error.message});
  }
}

export const acceptFriendReq = async(req,res)=>{

  try {
    const user = req.user;
    const {friendId} = req.params

    const friend = await User.findById(friendId)

    if(!friend) return res.status(404).json({msg:"User not found"})   
    
    const request = user.friendRequests.inComing.find(req=> req.from.toString() === friendId.toString())

    if(!request) return res.status(404).json({msg:"No friend request found"}) 

    // add friend
    user.friends.push(friendId)
    friend.friends.push(user._id)

    // remove requests
    user.friendRequests.inComing =  user.friendRequests.inComing.filter(req=>  req.from.toString() !== friendId.toString())
    friend.friendRequests.outGoing =  friend.friendRequests.outGoing.filter(req=>  req.to.toString() !== user._id.toString())

    let dmChannel = await Channel.findOne({
      type: "dm",
      participants: {$all:[user._id,friend._id], $size : 2}
    })

    if(!dmChannel){
      dmChannel = await Channel.create({
        name: friend.username + "_chat",
        type: "dm",
        participants: [user._id,friend._id]
      })
    }

    await Promise.all([user.save(),friend.save()])

    return res.status(200).json({ message: 'Friend request accepted', channelId: dmChannel._id })

  } catch (error) {
    console.log("Error in userController")
    return res.status(500).json({msg: error.message});
  }
}

export const rejectFriendReq = async(req,res)=>{

  try {
    const user = req.user;
    const {friendId} = req.params

    const friend = await User.findById(friendId)

    if(!friend) return res.status(404).json({msg:"User not found"})   
    
    const request = user.friendRequests.inComing.find(req=> req.from.toString() === friendId.toString())

    if(!request) return res.status(404).json({msg:"No friend request found"}) 

    user.friendRequests.inComing =  user.friendRequests.inComing.filter(req=>  req.from.toString() !== friendId.toString())
    friend.friendRequests.outGoing =  friend.friendRequests.outGoing.filter(req=>  req.to.toString() !== user._id.toString())

    await Promise.all([user.save(),friend.save()])

    return res.status(200).json({ message: 'Friend request rejected'})

  } catch (error) {
    console.log("Error in userController")
    return res.status(500).json({msg: error.message});
  }
}