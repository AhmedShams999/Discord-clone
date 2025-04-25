import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }, // Hashed
  avatar: { type: String, default: 'default-avatar.png' },
  status: { type: String, enum: ['online', 'offline', 'idle', 'dnd'], default: 'offline' },
  friendRequests: {
    inComing:[{
      from:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
      createdAt: { type: Date, default: Date.now },
    }],
    outGoing:[{
      to:{type: mongoose.Schema.Types.ObjectId, ref: 'User'},
      createdAt: { type: Date, default: Date.now },
    }]
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  servers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Server' }], // Servers joined
  roles: [
    {
      server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server' },
      role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    },
  ], // Roles per server
},{
  timestamps: true
});


const User = mongoose.model("User",userSchema);

export default User;