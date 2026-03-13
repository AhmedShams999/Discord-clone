import mongoose from "mongoose";
export const PERMISSIONS = {
  VIEW_CHANNEL: "view_channel",
  SEND_MESSAGES: "send_messages",
  CREATE_INVITES: "create_invites",
  KICK_MEMBERS: "kick_members",
  MANAGE_SERVER: "manage_server",
  MANAGE_CHANNELS: "manage_channels",
};

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., "@everyone"
    server: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
    },
    permissions: [
      {
        type: String,
        enum: PERMISSIONS,
      },
    ],
    position: { type: Number, default: 0 }, // For hierarchy
    color: { type: String, trim: true, default: "#314158" },
  },
  {
    timestamps: true,
  },
);

const Role = mongoose.model("Role", roleSchema);

export default Role;
