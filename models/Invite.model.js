import mongoose from "mongoose";


const inviteSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date },
  maxUses: { type: Number, default: 0 }, // 0 = unlimited
  uses: { type: Number, default: 0 },
},{
  timestamps: true
});

const Invite = mongoose.model("Invite",inviteSchema);

export default Invite;