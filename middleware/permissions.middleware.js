import Channel from "../models/Channel.model.js"
import Server from "../models/Server.model.js"
import User from "../models/User.model.js"


export const hasServerPermission = (permission)=> async (req,res,next)=>{
  const { serverId } = req.params;
  const user = req.user;

  try {
    if (!user) return res.status(404).json({ msg: "User not found" });

    const server = await Server.findById(serverId).select("owner");
    if (!server) return res.status(404).json({ msg: "Server not found" });

 
    // Owner gets full access
    if (server.owner.toString() === user._id.toString()) return next();

    // Populate and clean roles once
    await user.populate({
      path: "roles.role",
      match: { server: serverId },
    });

    // Pre-compute user's permissions for this server
    const userServerPermissions = user.roles
      .filter((r) => r.role)
      .sort((a, b) => b.role.position - a.role.position)
      .flatMap((r) => r.role.permissions);

    if (!userServerPermissions.includes(permission)) {
      return res.status(403).json({ msg: "Insufficient permissions" });
    }

    // Attach to request for use in route handlers if needed
    req.userPermissions = userServerPermissions;
    
    
    next();
  } catch (error) {
    console.error("Error in hasServerPermission middleware:", error);
    return res.status(500).json({ msg: error.message });
  }
}

export const hasChannelPermission = (permission)=> async (req,res,next)=>{
    const user = req.user
    const {channelId}= req.body
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

export const hasChannelPermissionV2 = (channel, userRoleIds, userServerPermissions, permission) => {
  const relevantPerms = channel.permissions.filter(p =>
    userRoleIds.includes(p.role.toString())
  );

  const isDenied = relevantPerms.some(p => p.deny.includes(permission));
  if (isDenied) return false;

  const isAllowed = relevantPerms.some(p => p.allow.includes(permission));
  if (isAllowed) return true;

  return userServerPermissions.includes(permission);
}; 