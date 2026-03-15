import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, trim: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: ["message", "invite"], default: "message" },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    }, // For server messages
    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        filename: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
      },
    ], // File references
    isPinned: { type: Boolean, default: false }, // Pinned messages
  },
  {
    timestamps: true,
  },
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
