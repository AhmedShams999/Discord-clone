import Channel from "../models/Channel.model.js";
import User from "../models/User.model.js";

export const getAllFriends = async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.query;

    let allFriends = [];

    if (status.toLowerCase() && status.toLowerCase() !== "all") {
      allFriends = await User.findById(user._id)
        .populate({
          path: "friends",
          select: "username status avatar email",
          match: { status: status },
        })
        .lean();
    } else {
      allFriends = await User.findById(user._id)
        .populate({
          path: "friends",
          select: "username status avatar email",
        })
        .lean();
    }

    return res.status(200).json(allFriends.friends);
  } catch (error) {
    console.log("Error in userController");
    return res.status(500).json({ msg: error.message });
  }
};

export const getSearchedUsers = async (req, res) => {
  try {
    const user = req.user;
    const { username } = req.query;

    let users = [];
    let reqInComing = user.friendRequests.inComing.map((req) => req.from);
    let reqOutGoing = user.friendRequests.outGoing.map((req) => req.to);
    const allExclodsID = [
      ...(user.friends || []),
      ...reqInComing,
      ...reqOutGoing,
    ];

    if (username) {
      users = await User.find({
        username: { $regex: `^${username.trim()}`, $ne: user.username },
        _id: { $nin: allExclodsID },
      })
        .select("username status avatar email")
        .sort({ username: 1 })
        .lean();
    }

    return res.status(200).json(users);
  } catch (error) {
    console.log("Error in userController");
    return res.status(500).json({ msg: error.message });
  }
};

export const sendFriendReq = async (req, res) => {
  try {
    const { username } = req.body;
    const user = req.user;
    if (!username)
      return res.status(400).json({ msg: "Please provied the username" });

    if (user.username == username)
      return res
        .status(400)
        .json({ msg: "You can't send friend request to your self" });

    const recipient = await User.findOne({ username });
    if (!recipient) return res.status(404).json({ msg: "No user found" });

    if (recipient.friends.includes(user._id))
      return res
        .status(400)
        .json({ msg: "You are already friend with this user" });

    const sentFriendReq =
      user.friendRequests.outGoing.some(
        (req) => req.to.toString() === recipient._id.toString(),
      ) ||
      recipient.friendRequests.inComing.some(
        (req) => req.from.toString() === user._id.toString(),
      );

    if (sentFriendReq) {
      return res.status(400).json({ msg: "A friend request already sent" });
    }

    user.friendRequests.outGoing.push({ to: recipient._id });
    recipient.friendRequests.inComing.push({ from: user._id });

    await Promise.all([user.save(), recipient.save()]);

    return res.status(200).json({ msg: "Friend request is sent" });
  } catch (error) {
    console.log("Error in userController");
    return res.status(500).json({ msg: error.message });
  }
};

export const getAllReq = async (req, res) => {
  try {
    const user = req.user;
    // const allReq = await User.findById(user._id)
    //   .populate('friends', 'username')
    //   .populate('friendRequests.inComing.from', 'username')
    //   .populate('friendRequests.outGoing.to', 'username');

    const allReq = await User.findById(user._id)
      .populate({
        path: "friendRequests.inComing.from",
        select: "username status avatar email",
      })
      .populate({
        path: "friendRequests.outGoing.to",
        select: "username status avatar email",
      });

    return res.status(200).json({ ...allReq.friendRequests });
  } catch (error) {
    console.log("Error in userController");
    return res.status(500).json({ msg: error.message });
  }
};

export const acceptFriendReq = async (req, res) => {
  try {
    const user = req.user;
    const { friendId } = req.body;

    const friend = await User.findById(friendId);

    if (!friend) return res.status(404).json({ msg: "User not found" });

    const request = user.friendRequests.inComing.find(
      (req) => req.from.toString() === friendId.toString(),
    );

    if (!request)
      return res.status(404).json({ msg: "No friend request found" });

    // add friend
    user.friends.push(friendId);
    friend.friends.push(user._id);

    // remove requests
    user.friendRequests.inComing = user.friendRequests.inComing.filter(
      (req) => req.from.toString() !== friendId.toString(),
    );
    friend.friendRequests.outGoing = friend.friendRequests.outGoing.filter(
      (req) => req.to.toString() !== user._id.toString(),
    );

    let dmChannel = await Channel.findOne({
      type: "dm",
      participants: { $all: [user._id, friend._id], $size: 2 },
    });

    if (!dmChannel) {
      dmChannel = await Channel.create({
        name: friend.username + "_chat",
        type: "dm",
        participants: [user._id, friend._id],
      });
    }

    await Promise.all([user.save(), friend.save()]);

    return res
      .status(200)
      .json({ message: "Friend request accepted", channelId: dmChannel._id });
  } catch (error) {
    console.log("Error in userController");
    return res.status(500).json({ msg: error.message });
  }
};

export const rejectFriendReq = async (req, res) => {
  try {
    const user = req.user;
    const { friendId } = req.body;

    const friend = await User.findById(friendId);

    if (!friend) return res.status(404).json({ msg: "User not found" });

    const request = user.friendRequests.inComing.find(
      (req) => req.from.toString() === friendId.toString(),
    );

    if (!request)
      return res.status(404).json({ msg: "No friend request found" });

    user.friendRequests.inComing = user.friendRequests.inComing.filter(
      (req) => req.from.toString() !== friendId.toString(),
    );
    friend.friendRequests.outGoing = friend.friendRequests.outGoing.filter(
      (req) => req.to.toString() !== user._id.toString(),
    );

    await Promise.all([user.save(), friend.save()]);

    return res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.log("Error in userController");
    return res.status(500).json({ msg: error.message });
  }
};

export const getUserInvites = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId)
      .populate({
        path: "pendingInvites.invite",
        populate: { path: "creator", select: "username avatar status email" },
      })
      .populate("pendingInvites.server", "name icon owner");

    const invites = user.pendingInvites
      .map((p) => {
        if (!p.invite) return null;

        const isExpired = p.invite.expiresAt && p.invite.expiresAt < new Date();
        const isMaxedOut =
          p.invite.maxUses > 0 && p.invite.uses >= p.invite.maxUses;
        if (isExpired || isMaxedOut) return null;

        return {
          server: {
            _id: p.server._id,
            name: p.server.name,
            icon: p.server.icon,
            owner: p.server.owner,
          },
          sender: {
            _id: p.invite.creator._id,
            avatar: p.invite.creator.avatar,
            email: p.invite.creator.email,
            status: p.invite.creator.status,
            username: p.invite.creator.username,
          },
          code: p.invite.code,
          expiresAt: p.invite.expiresAt,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ invites });
  } catch (error) {
    console.error("Error in getUserInvites:", error);
    return res.status(500).json({ msg: error.message });
  }
};
