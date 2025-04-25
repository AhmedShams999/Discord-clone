import { nanoid } from "nanoid";
import Channel from "../models/Channel.model.js";
import Role from "../models/Role.model.js";
import Server from "../models/Server.model.js";
import User from "../models/User.model.js";
import Invite from "../models/Invite.model.js";


export const createServer = async (req,res)=>{
  const {name} = req.body;
  const userId = req.user._id
  try {

    if(!name) return res.status(400).json({msg: "Name of the server is required"})
    
    const server = await Server.create({name,owner:userId,members:[userId]})

    const everyoneRole = await Role.create({name:"@everyone",server:server._id,permissions:['view_channel', 'send_messages', 'create_invites']})

    const adminRole = await Role.create({name:"Admin",server:server._id,permissions:['view_channel', 'send_messages', 'create_invites', 'kick_members', 'manage_server', 'manage_channels'],position: 1})


    const generalChannel = await Channel.create({name: "General",type:"text",server:server._id});

    server.roles.push(everyoneRole._id,adminRole._id);
    server.channels.push(generalChannel._id);
    await server.save();

    const user = await User.findById(userId);
    user.servers.push(server._id);
    user.roles.push(
      {server: server._id , role: everyoneRole._id},
      {server: server._id , role: adminRole._id}
    )
    await user.save();

    return res.status(201).json({server,msg:"server is created"})
    
  } catch (error) {
    console.log("Error in serverController")
    return res.status(500).json({msg: error.message});
  }
}

export const getAllServers = async (req,res)=>{
  const user = req.user
  try {
    const servers = await user.populate('servers')

    return res.status(200).json({servers})
  } catch (error) {
    console.log("Error in serverController")
    return res.status(500).json({msg: error.message});
  }
}

export const getAllChannels = async (req,res)=>{
    const {serverId} = req.params
    let user = req.user
  try {
    
    const server =  await Server.findOne({_id:serverId , members: user._id}).select('channels owner -_id').populate("channels")

    if(!server) return res.status(400).json({msg: "User is not a member in this server"})
    
    let showChannels = []
    const channels = server.channels

    if(server.owner.toString() == user._id.toString()){
      
      return res.status(200).json({channels})
    }
    user = await user.populate("roles.role roles.role")
   
    for (const channel of channels) {
      let show = false;
      
      let isAllowed = false;
      let isDenied = false;
      for (const perm of channel.permissions) {
        const userHasRole = user.roles.some(r=>{
         return r.role._id.toString() === perm.role.toString() && r.server.toString() === channel.server._id.toString()
        })
  
        if(userHasRole){
          if(perm.deny.includes('view_channel')){
            isDenied = true;
            break;
          }
          if(perm.allow.includes('view_channel')){
            isAllowed = true;
          }
        }
      }
      
      if(!isDenied && isAllowed){
        show = true
      }else if (!isDenied){
        const hasServerPermission = user.roles.some(r=>
          r.role.permissions.includes('view_channel') && r.server.toString() === channel.server.toString()
        );

        if(hasServerPermission){
          show = true
        }
      }
      
      // console.log(show)
      if(show){
        showChannels.push(channel);
      }
    }
    // console.log(channels)

    return res.status(200).json({showChannels})
  } catch (error) {
    console.log("Error in serverController")
    return res.status(500).json({msg: error.message});
  }
}

export const createInvites = async(req,res)=>{
  const {serverId} = req.params
  const userId = req.user._id
  const {expiresAt,maxUses} =  req.body // optional

  try {
    const server = await Server.findById(serverId);
    if(!server) return res.status(404).json({msg: "Server is not found"})

    const code = nanoid();

    const invite = await Invite.create({
      code,
      server: serverId,
      creator: userId,
      maxUses: maxUses || 0,
      expiresAt: expiresAt? new Date(expiresAt) : undefined,
    })

    if(!invite){
      return res.status(400).json({msg:"Error while creating the invite"})
    }

    server.invites.push(invite._id);
    await server.save();

    return res.status(201).json({invite,msg:"Invite is created"})

  } catch (error) {
    console.log("Error in serverController")
    return res.status(500).json({msg: error.message});
  }
}

export const acceptInvite = async (req,res)=>{
  const userId = req.user._id
  const {code} = req.params
  try {
    const invite = await Invite.findOne({code}).populate("server");
    if(!invite) return res.status(404).json({msg: "No invite found"});

    if(invite.expiresAt && invite.expiresAt < new Date()){
       return res.status(400).json({msg: "Invite expired"});
    }

    if(invite.maxUses > 0 && invite.uses >= invite.maxUses){
      return res.status(400).json({msg: "Invite max uses reached"});
    }

    // check if the user is a member already
    const server = invite.server;
    if(server.members.includes(userId)){
      return res.status(400).json({msg: "User is already a member"});
    }

    server.members.push(userId)
    invite.uses +=1;
    await Promise.all([server.save(),invite.save()]);

    // assign the @everyone role to the new user added to the server

    const everyoneRole = await Role.findOne({server: server._id , name: '@everyone'});
    if(!everyoneRole){
      return res.status(500).json({msg: "Defualt role not in this server"});
    }

    const user = await User.findById(userId)
    user.servers.push(server._id)
    user.roles.push({server: server._id,role: everyoneRole._id})
    await user.save()

    return res.status(200).json({msg:"User joined the server"})

  } catch (error) {
    console.log("Error in serverController")
    return res.status(500).json({msg: error.message});
  }
}

export const addChannel = async (req,res)=>{
  const {name,type} = req.body
  let {permissions} = req.body
  const user = req.user
  const {serverId} = req.params

  try {
    if(!name || !type) return res.status(400).json({msg: "All fields are required"})

    const server = await Server.findById(serverId).populate('roles')

    if(!server) return res.status(404).json({msg: "This server not exsist"})
    
      // if the user didn't enter permissions the default will be all roles are allowed
    if(!permissions){
      permissions = server.roles.map(role=>{
          return {
            role: role._id,
            allow: role.permissions,
            deny: []
          }
      })
    }
    const channel = await Channel.create({name,type,server:serverId,permissions});
    server.channels.push(channel._id)
    await server.save()
    return res.status(201).json({msg: "Channel is created",channel})

  } catch (error) {
    console.log("Error in serverController")
    return res.status(500).json({msg: error.message});
  }
}