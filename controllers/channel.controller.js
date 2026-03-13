import { voiceChannels } from "../lib/setupSocketHandlers.js";
import { uploadImages } from "../lib/uploadImages.js";
import Channel from "../models/Channel.model.js";
import Message from "../models/Message.model.js";
import User from "../models/User.model.js";

export const sendMessage = async (req, res) => {
  try {
    const user = req.user;
    const { content, channelId } = req.body;
    const image = req.files || [];
    console.log(channelId);
    if (!content && image.length == 0)
      return res.status(400).json({ msg: "Message must have content" });

    let attachments = [];

    for (const el of image) {
      try {
        let ImageUrl;
        if (el.mimetype.startsWith("audio/")) {
          ImageUrl = await uploadImages(
            el,
            res,
            "voices",
            "video",
            el.originalname,
          );
        } else {
          ImageUrl = await uploadImages(
            el,
            res,
            "messages",
            "image",
            el.originalname,
          );
        }

        attachments.push({
          url: ImageUrl,
          filename: el.originalname,
        });
      } catch (error) {
        console.log(`Failed to upload ${el.originalname}:`, error);
      }
    }

    const message = await Message.create({
      content,
      channel: channelId,
      author: user._id,
      attachments,
    });
    await message.populate("author", "username email avatar status");
    // ⭐ Get Socket.IO instance and broadcast the message
    const io = req.app.get("io");
    if (io) {
      io.to(`channel:${channelId}`).emit("new-message", {
        _id: message._id,
        content: message.content,
        author: {
          _id: message.author._id,
          email: message.author.email,
          username: message.author.username,
          avatar: message.author.avatar,
          status: message.author.status,
        },
        attachments: message.attachments,
        createdAt: message.createdAt,
      });
    }

    await message.populate("author", "username");
    return res.status(201).json({ msg: "Message is created", message });
  } catch (error) {
    console.log("Error in channelController");
    return res.status(500).json({ msg: error.message });
  }
};

export const getAllMessages = async (req, res) => {
  try {
    const user = req.user;
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId)
      .populate({
        path: "server",
        select: "name members",
        populate: {
          path: "members",
          select: "username status avatar email",
        },
      })
      .lean();

    if (!channel) return res.status(404).json({ msg: "No channel found" });

    const server = channel.server;

    const messages = await Message.find({ channel: channelId })
      .populate({
        path: "author",
        select: "username status email avatar",
      })
      .lean();

    return res.status(200).json({
      msg: `All ${channel.name} channel messages`,
      channel: { _id: channel._id, name: channel.name },
      server,
      messages,
    });
  } catch (error) {
    console.log("Error in channelController");
    return res.status(500).json({ msg: error.message });
  }
};

export const DMChannel = async (req, res) => {
  try {
    const user = req.user;
    const { friendUsername } = req.params;

    // 1. null check FIRST before accessing .friends
    const participant = await User.findOne(
      { username: friendUsername },
      "username email avatar status friends _id", // only fetch needed fields
    ).lean();

    if (!participant) return res.status(404).json({ error: "User not found" });

    if (participant._id.toString() === user._id.toString())
      return res.status(400).json({ error: "Cannot DM yourself" });

    // 2. use .some() instead of .filter() — stops at first match, no new array
    const isFriend = participant.friends.some(
      (friend) => friend.toString() === user._id.toString(),
    );

    if (!isFriend)
      return res.status(400).json({ error: "You can only chat with friends" });

    // 4. shared message populate helper
    const getMessages = (channelId) =>
      Message.find(
        { channel: channelId },
        "attachments createdAt content author",
      )
        .populate("author", "username status email avatar")
        .lean();

    let dmChannel = await Channel.findOne({
      type: "dm",
      participants: { $all: [participant._id, user._id], $size: 2 },
    }).lean();
    // 3. shared friend projection to avoid duplication
    let friendData = {
      _id: participant._id,
      username: participant.username,
      email: participant.email,
      avatar: participant.avatar,
      status: participant.status,
    };
    // 5. no need to fetch messages for a newly created channel (always empty)
    if (!dmChannel) {
      dmChannel = await Channel.create({
        type: "dm",
        name: `${user.username} chat with ${participant.username}`,
        participants: [participant._id, user._id],
      });
      friendData = { ...friendData, dmChannelId: dmChannel._id };
      return res
        .status(201)
        .json({ msg: "DM channel created", messages: [], friend: friendData });
    }

    friendData = { ...friendData, dmChannelId: dmChannel._id };
    const messages = await getMessages(dmChannel._id);
    return res
      .status(200)
      .json({ msg: "DM channel found", messages, friend: friendData });
  } catch (error) {
    console.error("Error in DMChannel:", error);
    return res.status(500).json({ msg: error.message });
  }
};

export const getVoiceChannelUsers = async (req, res) => {
  const { channelId } = req.params;

  try {
    const users = voiceChannels.has(channelId)
      ? [...voiceChannels.get(channelId)].map((u) => u.userId)
      : [];

    const userDetails = await User.find({
      _id: { $in: users },
    }).select("username avatar status");

    return res.status(200).json({ users: userDetails });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};
