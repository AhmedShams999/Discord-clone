import mongoose from "mongoose";


export const ConnectDB = async ()=>{
    try {
      const mongoDB = await mongoose.connect(process.env.MONGOURL)

      console.log(`DB connected : ${mongoDB.connection.host}`)
    } catch (error) {
      console.log("Error while connecting to DB : ",error.message)
    }
}