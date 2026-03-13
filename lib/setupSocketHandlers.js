import Notification from "../models/Notification.model.js";
import User from "../models/User.model.js";

export const voiceChannels = new Map();
const connectedUsers = new Map();

export const setupSocketHandlers = async (socket) => {
  const io = socket.server;
  connectedUsers.set(socket.userId.toString(), socket.id);

  await User.findByIdAndUpdate(socket.userId, {
    status: "online",
    lastSeen: new Date(),
  });

  socket.on("notification", async (notification) => {
    // Save to DB
    const saved = await Notification.create({
      title: notification.title,
      type: notification.type,
      senderId: notification.senderId,
      receiverId: notification.receiverId,
    });

    // Send to receiver if they're online
    const receiverSocketId = connectedUsers.get(
      notification.receiverId.toString(),
    );
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("notification", saved);
    }
  });

  socket.emit("update-logged-user-state", {
    status: "online",
    lastSeen: new Date(),
  });

  socket.on("join-channel", (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on("leave-channel", (channelId) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on("voice:join", async ({ channelId }) => {
    if (!voiceChannels.has(channelId)) {
      voiceChannels.set(channelId, new Set());
    }

    socket.join(`voice:${channelId}`);

    voiceChannels.get(channelId).add({
      userId: socket.userId,
      socketId: socket.id,
    });

    const usersInChannel = [...voiceChannels.get(channelId)].filter(
      (u) => u.userId.toString() !== socket.userId.toString(),
    );

    const [userDetails, joiningUser] = await Promise.all([
      Promise.all(
        usersInChannel.map(async (u) => {
          const user = await User.findById(u.userId).select("username avatar");
          return {
            userId: u.userId.toString(),
            username: user.username,
            avatar: user.avatar,
            hasCameraOn: u.cameraOn ?? false, // ✅
          };
        }),
      ),
      User.findById(socket.userId).select("username avatar"),
    ]);

    socket.emit("voice:users-in-channel", userDetails);

    socket.to(`voice:${channelId}`).emit("voice:user-joined", {
      userId: socket.userId.toString(),
      username: joiningUser.username,
      avatar: joiningUser.avatar,
    });
  });

  socket.on("voice:offer", ({ to, offer }) => {
    const targetSocketId = connectedUsers.get(to);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit("voice:offer", { from: socket.userId, offer });
  });

  socket.on("voice:answer", ({ to, answer }) => {
    const targetSocketId = connectedUsers.get(to);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit("voice:answer", { from: socket.userId, answer });
  });

  socket.on("voice:ice-candidate", ({ to, candidate }) => {
    const targetSocketId = connectedUsers.get(to);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit("voice:ice-candidate", {
      from: socket.userId,
      candidate,
    });
  });

  socket.on("voice:leave", ({ channelId }) => {
    const users = voiceChannels.get(channelId);
    if (users) {
      const userToRemove = [...users].find(
        (u) => u.userId.toString() === socket.userId.toString(),
      );
      if (userToRemove) users.delete(userToRemove);
      if (users.size === 0) voiceChannels.delete(channelId);
    }
    socket
      .to(`voice:${channelId}`)
      .emit("voice:user-left", socket.userId.toString());
    socket.leave(`voice:${channelId}`);
  });

  socket.on("voice:camera-on", ({ channelId }) => {
    const users = voiceChannels.get(channelId);
    if (users) {
      const user = [...users].find(
        (u) => u.userId.toString() === socket.userId.toString(),
      );
      if (user) user.cameraOn = true;
    }
    socket.to(`voice:${channelId}`).emit("voice:camera-on", {
      userId: socket.userId.toString(),
    });
  });

  socket.on("voice:camera-off", ({ channelId }) => {
    const users = voiceChannels.get(channelId);
    if (users) {
      const user = [...users].find(
        (u) => u.userId.toString() === socket.userId.toString(),
      );
      if (user) user.cameraOn = false;
    }
    socket.to(`voice:${channelId}`).emit("voice:camera-off", {
      userId: socket.userId.toString(),
    });
  });

  socket.on("disconnect", async () => {
    connectedUsers.delete(socket.userId.toString());
    await User.findByIdAndUpdate(socket.userId, {
      status: "offline",
      lastSeen: new Date(),
    });

    voiceChannels.forEach((users, channelId) => {
      const userToRemove = [...users].find((u) => u.socketId === socket.id);
      if (userToRemove) {
        users.delete(userToRemove);
        socket
          .to(`voice:${channelId}`)
          .emit("voice:user-left", socket.userId.toString());
        if (users.size === 0) voiceChannels.delete(channelId);
      }
    });
  });
};
