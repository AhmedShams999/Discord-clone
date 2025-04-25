import Message from "../models/Message.model.js"


export const sendMessage = async(req,res)=>{
  const user = req.user
  const {channelId} = req.params
  const {content} = req.body
  const image = req.files

  try {
    if(!content) return res.status(400).json({msg:"Message must have content"})
    
    let attachments = image.map(element => {
        return {
          url: element.path,
          filename: element.originalname
        }
    });

    const message = await Message.create({content,channel:channelId,author:user._id,attachments})
    await message.populate('author', 'username')
    return res.status(201).json({msg: "Message is created",message})
  } catch (error) {
    console.log("Error in channelController")
    return res.status(500).json({msg: error.message});
  }
}