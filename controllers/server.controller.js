import { nanoid } from "nanoid";
import Channel from "../models/Channel.model.js";
import Role, { PERMISSIONS } from "../models/Role.model.js";
import Server from "../models/Server.model.js";
import User from "../models/User.model.js";
import Invite from "../models/Invite.model.js";
import { uploadImages } from "../lib/uploadImages.js";
import { hasChannelPermissionV2 } from "../middleware/permissions.middleware.js";
import mongoose from "mongoose";

export const createServer = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { name } = req.body;
    const userId = req.user._id;
    let serverIcon =
      "https://res.cloudinary.com/dwy8m1r5r/image/upload/v1749744855/auth_avatars/default_zogf9e.jpg";

    if (!name) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "Name of the server is required" });
    }

    if (req.file) {
      serverIcon = await uploadImages(
        req,
        res,
        "auth",
        "image",
        name.replace(/\s+/g, "_"),
      );
    }

    // Create server
    const [server] = await Server.create(
      [
        {
          name,
          owner: userId,
          icon: serverIcon,
          members: [userId],
        },
      ],
      { session },
    );

    // Create roles simultaneously
    const [everyoneRole, adminRole] = await Promise.all([
      Role.create(
        [
          {
            name: "@everyone",
            server: server._id,
            permissions: [
              PERMISSIONS.VIEW_CHANNEL,
              PERMISSIONS.SEND_MESSAGES,
              PERMISSIONS.CREATE_INVITES,
            ],
            position: 1,
          },
        ],
        { session },
      ),

      Role.create(
        [
          {
            name: "Admin",
            server: server._id,
            permissions: [
              PERMISSIONS.VIEW_CHANNEL,
              PERMISSIONS.SEND_MESSAGES,
              PERMISSIONS.CREATE_INVITES,
              PERMISSIONS.KICK_MEMBERS,
              PERMISSIONS.MANAGE_CHANNELS,
              PERMISSIONS.MANAGE_SERVER,
            ],
          },
        ],
        { session },
      ),
    ]);

    // Create general channel
    const [generalChannel] = await Channel.create(
      [
        {
          name: "General",
          type: "text",
          server: server._id,
        },
      ],
      { session },
    );

    // Update server and user simultaneously
    await Promise.all([
      Server.findByIdAndUpdate(
        server._id,
        {
          $push: {
            roles: { $each: [everyoneRole[0]._id, adminRole[0]._id] },
            channels: generalChannel._id,
          },
        },
        { session },
      ),

      User.findByIdAndUpdate(
        userId,
        {
          $push: {
            servers: server._id,
            roles: {
              $each: [
                { server: server._id, role: everyoneRole[0]._id },
                { server: server._id, role: adminRole[0]._id },
              ],
            },
          },
        },
        { session },
      ),
    ]);

    await session.commitTransaction();

    return res.status(201).json({ server, msg: "Server created" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error in createServer:", error);
    return res.status(500).json({ msg: error.message });
  } finally {
    session.endSession();
  }
};

export const getServerData = async (req, res) => {
  const user = req.user;
  const { serverId } = req.params;

  try {
    const servers = await Server.findOne({ _id: serverId, members: user._id })
      .select("-_id name members owner icon")
      .populate([
        { path: "members", select: "username status avatar email roles" },
        { path: "owner", select: "username status avatar email" },
      ])
      .lean();

    return res
      .status(200)
      .json({ msg: "Server Data Found Successfuly", data: servers });
  } catch (error) {
    console.log("Error in serverController");
    return res.status(500).json({ msg: error.message });
  }
};

export const getAllChannels = async (req, res) => {
  const { serverId } = req.params;
  const user = req.user;

  try {
    const server = await Server.findOne({ _id: serverId, members: user._id })
      .select("channels name icon owner -_id")
      .populate("channels", "_id createdAt name type permissions");

    if (!server)
      return res
        .status(400)
        .json({ msg: "User is not a member in this server" });

    // Owner sees everything
    if (server.owner.toString() === user._id.toString())
      return res.status(200).json({
        msg: "Channels Found Successfuly",
        ownerId: server.owner._id,
        data: server.channels,
      });

    // Load user roles once
    await user.populate("roles.role");

    // Get user's role IDs for this server
    const userRoleIds = user.roles
      .filter((r) => r.server.toString() === serverId)
      .map((r) => r.role._id.toString());

    // Get user's server-level permissions
    const userServerPermissions = user.roles
      .filter((r) => r.server.toString() === serverId)
      .flatMap((r) => r.role.permissions);

    const showChannels = server.channels.filter((channel) =>
      hasChannelPermissionV2(
        channel,
        userRoleIds,
        userServerPermissions,
        "view_channel",
      ),
    );

    return res.status(200).json({
      msg: "Channels Found Successfuly",
      ownerId: server.owner._id,
      data: showChannels,
    });
  } catch (error) {
    console.error("Error in getAllChannels:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const createInvites = async (req, res) => {
  const { serverId } = req.params;
  const userId = req.user._id;
  const { expiresAt, maxUses } = req.body;

  try {
    const server = await Server.findById(serverId);
    if (!server) return res.status(404).json({ msg: "Server is not found" });
    // Fetch the most recent invite for this user on this server
    const existingInvite = await Invite.findOne({
      server: serverId,
      creator: userId,
    });
    if (existingInvite) {
      const isExpired =
        existingInvite.expiresAt && existingInvite.expiresAt < new Date();
      const isMaxedOut =
        existingInvite.maxUses > 0 &&
        existingInvite.uses >= existingInvite.maxUses;

      // Existing invite is still valid — return it
      if (!isExpired && !isMaxedOut) {
        return res.status(200).json({
          invite: existingInvite,
          msg: "Existing invite returned",
        });
      }

      // Existing invite is dead — delete it and create a fresh one
      await Invite.findByIdAndDelete(existingInvite._id);
    }

    // No valid invite found — create a new one
    const code = nanoid(10);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const invite = await Invite.create({
      code,
      server: serverId,
      creator: userId,
      maxUses: maxUses || 3,
      expiresAt: expiresAt ? new Date(expiresAt) : threeDaysFromNow,
    });

    return res.status(201).json({ invite, msg: "Invite created" });
  } catch (error) {
    console.error("Error in createInvites:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const acceptInvite = async (req, res) => {
  const userId = req.user._id;
  const { code } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const invite = await Invite.findOne({ code })
      .populate("server")
      .session(session);

    if (!invite) {
      await session.abortTransaction();
      return res.status(404).json({ msg: "No invite found" });
    }

    const server = invite.server;

    if (server.members.includes(userId)) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "User is already a member" });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "Invite expired" });
    }

    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      await session.abortTransaction();
      return res.status(400).json({ msg: "Invite max uses reached" });
    }

    const everyoneRole = await Role.findOne({
      server: server._id,
      name: "@everyone",
    }).session(session);

    if (!everyoneRole) {
      await session.abortTransaction();
      return res.status(500).json({ msg: "Default role not found" });
    }

    // All run inside the transaction — if ANY fails, ALL roll back
    await Promise.all([
      Server.findByIdAndUpdate(
        server._id,
        { $push: { members: userId } },
        // ✅ removed $pull pendingInvites from here
        { session },
      ),

      Invite.findByIdAndUpdate(invite._id, { $inc: { uses: 1 } }, { session }),

      User.findByIdAndUpdate(
        userId,
        {
          $push: {
            servers: server._id,
            roles: { server: server._id, role: everyoneRole._id },
          },
          // ✅ remove from user.pendingInvites now
          $pull: { pendingInvites: { server: server._id } },
        },
        { session },
      ),
    ]);

    // Everything succeeded — commit
    await session.commitTransaction();

    return res.status(200).json({
      msg: "User joined the server",
      server: {
        _id: server._id,
        name: server.name,
        icon: server.icon,
        owner: server.owner,
      },
    });
  } catch (error) {
    // Any error — roll back everything as if nothing happened
    await session.abortTransaction();
    console.error("Error in acceptInvite:", error);
    return res.status(500).json({ msg: error.message });
  } finally {
    // Always end the session
    session.endSession();
  }
};

export const getFriendsNotInServer = async (req, res) => {
  const { serverId } = req.params;
  const currentUser = req.user;

  try {
    const user = await User.findById(currentUser._id).populate({
      path: "friends",
      select: "username avatar status pendingInvites",
    });

    const server = await Server.findById(serverId).select("members");
    if (!server) return res.status(404).json({ msg: "Server not found" });

    const memberIds = new Set(server.members.map((m) => m.toString()));

    // Everything done in memory — no extra DB calls
    const friends = user.friends
      .filter((friend) => {
        const isMember = memberIds.has(friend._id.toString());
        const hasPendingInvite = friend.pendingInvites?.some(
          (p) => p.server?.toString() === serverId,
        );
        return !isMember && !hasPendingInvite;
      })
      .map(({ _id, username, avatar, status }) => ({
        _id,
        username,
        avatar,
        status, // ✅ only send what frontend needs
      }));

    return res.status(200).json({ msg: "Found Friends", friends });
  } catch (error) {
    console.error("Error in getFriendsNotInServer:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const getInviteByCode = async (req, res) => {
  const user = req.user;
  const { code } = req.params;

  try {
    const invite = await Invite.findOne({ code })
      .populate("server", "name icon owner members")
      .populate("creator", "username avatar email status");

    if (!invite) return res.status(404).json({ msg: "Invite not found" });

    // Check if invite is still valid
    const isExpired = invite.expiresAt && invite.expiresAt < new Date();
    const isMaxedOut = invite.maxUses > 0 && invite.uses >= invite.maxUses;

    if (isExpired || isMaxedOut) {
      return res.status(400).json({ msg: "Invite is no longer valid" });
    }

    // ✅ check if user is already a member
    const isMember = invite.server.members.some(
      (m) => m.toString() === user._id.toString(),
    );

    return res.status(200).json({
      isMember,
      server: {
        _id: invite.server._id,
        name: invite.server.name,
        icon: invite.server.icon,
        owner: invite.server.owner,
      },
      sender: {
        _id: invite.creator._id,
        username: invite.creator.username,
        avatar: invite.creator.avatar,
        email: invite.creator.email,
        status: invite.creator.status,
      },
      code: invite.code,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("Error in getInviteByCode:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const sendInviteToFriend = async (req, res) => {
  const { serverId } = req.params;
  const { friendId } = req.body;
  const sender = req.user;

  try {
    const isFriend = sender.friends.includes(friendId);
    if (!isFriend) return res.status(403).json({ msg: "Not your friend" });

    const server = await Server.findById(serverId).select("members");
    if (!server) return res.status(404).json({ msg: "Server not found" });

    if (server.members.includes(friendId)) {
      return res.status(400).json({ msg: "Friend is already in this server" });
    }

    // ✅ check pending from friend's user document directly
    const friend = await User.findById(friendId).select("pendingInvites");
    const alreadyPending = friend.pendingInvites.some(
      (p) => p.server.toString() === serverId.toString(),
    );
    if (alreadyPending) {
      return res
        .status(400)
        .json({ msg: "Friend already has a pending invite" });
    }

    const invite = await Invite.findOne({
      server: serverId,
      creator: sender._id,
    });
    if (!invite) {
      return res.status(404).json({ msg: "Create an invite first" });
    }

    // ✅ push to user.pendingInvites instead of server
    await User.findByIdAndUpdate(friendId, {
      $push: {
        pendingInvites: {
          server: serverId,
          invite: invite._id,
        },
      },
    });
    // Emit socket event to friend if online
    // const friendSocketId = connectedUsers.get(friendId.toString());
    // if (friendSocketId) {
    //   io.to(friendSocketId).emit("invite:receive", {
    //     code: invite.code,
    //     server: {
    //       _id: server._id,
    //       name: server.name,
    //       icon: server.icon,
    //     },
    //     sender: {
    //       _id: sender._id,
    //       username: sender.username,
    //       avatar: sender.avatar,
    //     },
    //     url: `${process.env.CLIENT_URL}/invite/${invite.code}`
    //   });
    // }

    return res.status(200).json({ msg: "Invite sent" });
  } catch (error) {
    console.error("Error in sendInviteToFriend:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const getUserServerRoles = async (req, res) => {
  const { serverId } = req.params;
  const user = req.user;

  try {
    const [serverRoles] = await Promise.all([
      Role.find({ server: serverId }).select("_id name permissions color"),
      user.populate({
        path: "roles.role",
        match: { server: serverId },
        select: "_id permissions name",
      }),
    ]);

    const userRoles = user.roles
      .filter((r) => r.role && r.server.toString() === serverId)
      .map((r) => ({
        _id: r.role._id,
        name: r.role.name,
      }));

    const permissions = [
      ...new Set(
        user.roles
          .filter((r) => r.role && r.server.toString() === serverId)
          .flatMap((r) => r.role.permissions),
      ),
    ];
    return res.status(200).json({ userRoles, permissions, serverRoles });
  } catch (error) {
    console.error("Error in getUserServerRoles:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const addRole = async (req, res) => {
  const { serverId } = req.params;
  const { name, permissions, color } = req.body;

  try {
    if (!name) return res.status(400).json({ msg: "Role name is required" });

    // Get the highest position in the server and add 1
    const highestRole = await Role.findOne({ server: serverId })
      .sort({ position: -1 })
      .select("position");

    const position = highestRole ? highestRole.position + 1 : 0;

    const role = await Role.create({
      name,
      permissions: permissions || [],
      position,
      server: serverId,
      color,
    });

    await Server.findByIdAndUpdate(serverId, {
      $push: { roles: role._id },
    });

    return res.status(201).json({ role, msg: "Role created" });
  } catch (error) {
    console.error("Error in addRole:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const updateRoles = async (req, res) => {
  const { serverId } = req.params;
  const { roles } = req.body; // [{ roleId, name, permissions }]

  try {
    // Validate all roleIds belong to this server
    const serverRoles = await Role.find({ server: serverId }).select("_id");
    const serverRoleIds = new Set(serverRoles.map((r) => r._id.toString()));

    const invalidRoles = roles.filter((r) => !serverRoleIds.has(r.roleId));
    if (invalidRoles.length > 0) {
      return res
        .status(400)
        .json({ msg: "Some roles don't belong to this server" });
    }

    const updates = roles.map((r) => ({
      updateOne: {
        filter: { _id: r.roleId, server: serverId },
        update: {
          $set: {
            ...(r.name && { name: r.name }),
            ...(r.color && { color: r.color }),
            ...(r.permissions && {
              permissions: Array.isArray(r.permissions)
                ? r.permissions
                : r.permissions.split(",").map((p) => p.trim()),
            }),
          },
        },
      },
    }));

    await Role.bulkWrite(updates, { runValidators: true });

    const updatedRoles = await Role.find({ server: serverId }).select(
      "_id name permissions position",
    );

    return res.status(200).json({ roles: updatedRoles, msg: "Roles updated" });
  } catch (error) {
    console.error("Error in updateRoles:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const getServerMembersWithRoles = async (req, res) => {
  const { serverId } = req.params;

  try {
    const server = await Server.findById(serverId)
      .select("members")
      .populate({
        path: "members",
        select: "username avatar status email roles",
        populate: {
          path: "roles.role",
          match: { server: serverId },
          select: "_id",
        },
      });

    if (!server) return res.status(404).json({ msg: "Server not found" });

    const members = server.members.map((member) => ({
      _id: member._id,
      username: member.username,
      avatar: member.avatar,
      status: member.status,
      email: member.email,
      roles: member.roles
        .filter((r) => r.role && r.server.toString() === serverId)
        .map((r) => r.role._id),
    }));

    return res.status(200).json({ members });
  } catch (error) {
    console.error("Error in getServerMembers:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const updateServerMembersRoles = async (req, res) => {
  const { serverId } = req.params;
  const { members } = req.body;

  try {
    // Validate all roleIds belong to this server
    const serverRoles = await Role.find({ server: serverId }).select("_id");
    const serverRoleIds = new Set(serverRoles.map((r) => r._id.toString()));

    for (const member of members) {
      const invalidRoles = member.roles.filter(
        (r) => !serverRoleIds.has(r.toString()),
      );
      if (invalidRoles.length > 0) {
        return res
          .status(400)
          .json({ msg: `Invalid roles for member ${member.memberId}` });
      }
    }

    // For each member: remove old server roles then add new ones
    const updates = members
      .map((member) => [
        // Step 1 — remove all existing roles for this server
        {
          updateOne: {
            filter: { _id: member.memberId },
            update: {
              $pull: { roles: { server: serverId } },
            },
          },
        },
        // Step 2 — add new roles for this server
        {
          updateOne: {
            filter: { _id: member.memberId },
            update: {
              $push: {
                roles: {
                  $each: member.roles.map((roleId) => ({
                    server: serverId,
                    role: roleId,
                  })),
                },
              },
            },
          },
        },
      ])
      .flat();

    await User.bulkWrite(updates);

    return res.status(200).json({ msg: "Members roles updated" });
  } catch (error) {
    console.error("Error in updateMemberRoles:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const addChannel = async (req, res) => {
  const { name, type } = req.body;
  let { permissions } = req.body;
  const { serverId } = req.params;

  try {
    if (!name || !type)
      return res.status(400).json({ msg: "All fields are required" });

    const server = await Server.findById(serverId).populate("roles");
    if (!server) return res.status(404).json({ msg: "This server not found" });

    // Default — all roles can view the channel
    if (!permissions || permissions.length === 0) {
      permissions = server.roles.map((role) => ({
        role: role._id,
        allow: [PERMISSIONS.VIEW_CHANNEL],
        deny: [],
      }));
    }
    const channel = await Channel.create({
      name,
      type,
      server: serverId,
      permissions,
    });

    await Server.findByIdAndUpdate(serverId, {
      $push: { channels: channel._id },
    });
    return res.status(201).json({ msg: "Channel is created", channel });
  } catch (error) {
    console.log("Error in serverController");
    return res.status(500).json({ msg: error.message });
  }
};

export const removeChannel = async (req, res) => {
  const { serverId, channelId } = req.params;

  try {
    const server = await Server.findById(serverId);
    if (!server) return res.status(404).json({ msg: "Server not found" });

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ msg: "Channel not found" });

    if (channel.server.toString() !== serverId)
      return res
        .status(403)
        .json({ msg: "Channel does not belong to this server" });

    await Channel.findByIdAndDelete(channelId);

    await Server.findByIdAndUpdate(serverId, {
      $pull: { channels: channelId },
    });

    return res.status(200).json({ msg: "Channel deleted" });
  } catch (error) {
    console.log("Error in removeChannel");
    return res.status(500).json({ msg: error.message });
  }
};
