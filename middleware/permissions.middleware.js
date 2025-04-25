import Channel from "../models/Channel.model.js"
import Server from "../models/Server.model.js"
import User from "../models/User.model.js"


export const hasServerPermission = (permission)=> async (req,res,next)=>{
  let user = req.user
  const {serverId} = req.params
  
  try {
    // Fetch user with roles populated
    if(!user) return res.status(404).json({msg: "User not found"})

    user = await user.populate({
      path: 'roles.role',
      match: {server: serverId},
    })


    user.roles = user.roles
      .filter(r => r.role)
      .sort((a, b) => b.role.position - a.role.position);

    
    const server = await Server.findById(serverId);

    if(!server) return res.status(404).json({msg: "Server not found"})

    // check if he is the owner to grante full access
    if(server.owner.toString() == user._id.toString()){
      return next();
    }

    // check if any role have the permission

    const hasPermission = user.roles.some(userRole=>
      userRole.role.permissions.includes(permission)
    )

    if(!hasPermission){
      return res.status(403).json({msg: "Insufficient permissions"})
    }

    next()

  } catch (error) {
    console.log("Error in permissions middleware")
    return res.status(500).json({msg: error.message});
  }
}

export const hasChannelPermission = (permission)=> async (req,res,next)=>{
    const user = req.user
    const {channelId}= req.params
  try {
    const channel = await Channel.findById(channelId).populate("server")

    if(!channel) return res.status(404).json({msg: "No channel found"})
    
    if(channel.type == "dm"){

        if(channel.participants.includes(user._id)){
          return next()
        }
        return res.status(403).json({msg: "Not a dm participants"})
    }

    // check if he is the owner of the server

    if(channel.server.owner.toString() == user._id.toString()){
      return next();
    }

    let isAllowed = false;
    let isDenied = false;

    for (const perm of channel.permissions) {
      const userHasRole = user.roles.some(r=>
          r.role.toString() === perm.role.toString() && r.server.toString() === channel.server._id.toString()
      )

      if(userHasRole){
        if(perm.deny.includes(permission)){
          isDenied = true;
          break;
        }
        if(perm.allow.includes(permission)){
          isAllowed = true;
        }
      }
    }

    if(isDenied){
      return res.status(403).json({msg: `Missing permission: ${permission}`})
    }

    if(isAllowed){
      return next()
    }

    // if there are no permissions in the channel it self we fall back to the server permissions
    req.params.serverId = channel.server._id.toString()
    return hasServerPermission(permission)(req,res,next);
  } catch (error) {
    console.log("Error in permissions middleware")
    return res.status(500).json({msg: error.message});
  }
}