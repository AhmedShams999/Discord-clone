import mongoose from "mongoose";


const channelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['text', 'voice', 'dm'], default: 'text' },
  server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // For DMs
  permissions: [
    {
      role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
      allow: [String], // e.g., ['send_messages']
      deny: [String], // e.g., ['send_messages']
    },
  ],
},{
  timestamps: true
});

channelSchema.path("server").validate(function (value) {
  const hasServer = !!value;
  const hasParticipants = this.participants && this.participants.length > 0;

  // Exactly one must be set
  return (hasServer && !hasParticipants) || (!hasServer && hasParticipants);
}, 'Exactly one of server or participants must be set.');

channelSchema.path("participants").validate(function (value) {
  const hasServer = !!this.server;
  const hasParticipants = value && value.length > 0;

  // Exactly one must be set
  return (hasServer && !hasParticipants) || (!hasServer && hasParticipants);
}, 'Exactly one of server or participants must be set.');

const Channel = mongoose.model("Channel",channelSchema);

export default Channel;