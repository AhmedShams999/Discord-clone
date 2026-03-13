import mongoose from "mongoose";

const serverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    icon: { type: String, default: "default_serverIcon.png" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    channels: [{ type: mongoose.Schema.Types.ObjectId, ref: "Channel" }],
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
    invites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invite" }],
  
  },
  {
    timestamps: true,
  },
);

const Server = mongoose.model("Server", serverSchema);

export default Server;
