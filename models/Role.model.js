import mongoose from "mongoose";


const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., "@everyone"
  server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  permissions: [String], // e.g., ['send_messages', 'view_channel']
  position: { type: Number, default: 0 }, // For hierarchy
},{
  timestamps: true
});

const Role = mongoose.model("Role",roleSchema);

export default Role;