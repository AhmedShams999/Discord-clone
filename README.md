# 🔧 Discord Clone — Backend

A real-time backend for a Discord-like application built with Node.js, Express, MongoDB, Socket.IO, and WebRTC signaling.

🌐 **Live API:** [https://discord-clone-api-2uq1.onrender.com](https://discord-clone-api-2uq1.onrender.com)

---

## ✨ Features

- 🔐 JWT Bearer token authentication
- 💬 Real-time messaging via Socket.IO
- 🎙️ WebRTC signaling for peer-to-peer voice & video
- 📁 File uploads (images, audio, video) via Cloudinary & Multer
- 🔔 Real-time notification system with cooldown logic
- 👥 Friend request system
- 🏠 Server & channel management with roles & permissions
- 🟢 Online/offline user status tracking

---

## 🛠️ Tech Stack

| Technology         | Usage                |
| ------------------ | -------------------- |
| Node.js + Express  | REST API & server    |
| MongoDB + Mongoose | Database             |
| Socket.IO          | Real-time events     |
| Cloudinary         | Media storage        |
| Multer             | File upload handling |
| JWT                | Authentication       |
| bcrypt             | Password hashing     |

---

## 📁 Project Structure

```
├── config/
│   └── DB.js                  # MongoDB connection
├── controllers/
│   ├── auth.controller.js
│   ├── channel.controller.js
│   ├── notification.controller.js
│   ├── server.controller.js
│   └── user.controller.js
├── lib/
│   └── setupSocketHandlers.js # All Socket.IO event handlers
    └── uploadImages.js # All Cloudnairy Functions to upload
├── middleware/
│   └── auth.middleware.js     # JWT protect route & socket
├── models/
│   ├── Channel.model.js
│   ├── Message.model.js
│   ├── Notification.model.js
│   ├── Server.model.js
│   ├── User.model.js
│   └── ...
├── routes/
│   ├── auth.routes.js
│   ├── channel.route.js
│   ├── notification.route.js
│   ├── server.route.js
│   └── user.route.js
├── utils/
│   └── uploadImages.js        # Cloudinary upload helper
└── index.js                   # Entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB database (local or Atlas)
- Cloudinary account

### Installation

```bash
# Clone the repo
git clone https://github.com/AhmedShams999/Discord-clone
cd discord-clone-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root:

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Run

```bash
# Development
npm run dev

# Production
npm start
```

---

## 📡 API Endpoints

### Auth

| Method | Endpoint           | Description           |
| ------ | ------------------ | --------------------- |
| POST   | `/api/auth/signup` | Register a new user   |
| POST   | `/api/auth/login`  | Login and receive JWT |
| POST   | `/api/auth/logout` | Logout                |

### Channels

| Method | Endpoint                    | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| POST   | `/api/channel/send`         | Send a message with optional media |
| GET    | `/api/channel/:id/messages` | Get messages for a channel         |

### Notifications

| Method | Endpoint                      | Description                    |
| ------ | ----------------------------- | ------------------------------ |
| GET    | `/api/notifications`          | Get all notifications for user |
| PATCH  | `/api/notifications/read-all` | Mark all as read               |
| DELETE | `/api/notifications/clear`    | Clear all notifications        |

### Servers & Users

| Method | Endpoint      | Description        |
| ------ | ------------- | ------------------ |
| GET    | `/api/server` | Get user's servers |
| POST   | `/api/server` | Create a server    |
| GET    | `/api/user`   | Get user profile   |

---

## 🔌 Socket.IO Events

### Emitted by client

| Event                 | Payload             | Description            |
| --------------------- | ------------------- | ---------------------- |
| `voice:join`          | `{ channelId }`     | Join a voice channel   |
| `voice:leave`         | `{ channelId }`     | Leave a voice channel  |
| `voice:offer`         | `{ to, offer }`     | Send WebRTC offer      |
| `voice:answer`        | `{ to, answer }`    | Send WebRTC answer     |
| `voice:ice-candidate` | `{ to, candidate }` | Send ICE candidate     |
| `voice:camera-on`     | `{ channelId }`     | Notify camera enabled  |
| `voice:camera-off`    | `{ channelId }`     | Notify camera disabled |
| `notification`        | `{ notification }`  | Emit a notification    |

### Emitted by server

| Event                    | Payload                        | Description                 |
| ------------------------ | ------------------------------ | --------------------------- |
| `voice:users-in-channel` | `users[]`                      | Existing users when joining |
| `voice:user-joined`      | `{ userId, username, avatar }` | New user joined             |
| `voice:user-left`        | `userId`                       | User left channel           |
| `new-message`            | `message`                      | New message in channel      |
| `notification`           | `notification`                 | Real-time notification      |

---

## 🌍 Deployment

Deployed on **Render** (free tier).

- Auto-deploys on push to `main`
- Environment variables set in Render dashboard
- WebSockets fully supported
