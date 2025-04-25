import express from 'express'
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.routes.js"
import serverRoute from "./routes/server.route.js"
import channelRoute from "./routes/channel.route.js"
import userRoute from "./routes/user.route.js"
import { ConnectDB } from './config/DB.js'


const app = express()
dotenv.config()

const PORT = process.env.PORT

app.use('/uploads', express.static('uploads'));
app.use(express.json())
app.use(cookieParser());

app.use('/api/auth',authRoute)
app.use('/api/server',serverRoute)
app.use('/api/channel',channelRoute)
app.use('/api/user',userRoute)

app.listen(PORT,()=>{
  console.log(`server is running at http://localhost:${PORT}`);
  ConnectDB();
})