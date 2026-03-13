import cloudinary from "../config/CloudnairyConfig.js";

export const uploadImages = async (req,res,folderName,type,fileName) => {
   try {
    // Accept either the multer file (req.file) or a plain file-like object passed as req
    const fileObj = req.file ?? req;
    if (!fileObj || !fileObj.buffer) {
      return res.status(400).json({ msg: "No file provided for upload" });
    }

    // Convert buffer to base64 for upload
    const fileStr = `data:${fileObj.mimetype};base64,${fileObj.buffer.toString("base64")}`;
    
    const result = await cloudinary.uploader.upload(fileStr, {
      folder: folderName,
      public_id: `${folderName == 'auth' ? 'avatar' : 'message'}_${fileName}_${Date.now()}`,
      overwrite: true,
      resource_type: type,
      transformation: [
        { fetch_format: 'auto' },
        ...(folderName === 'auth'
          ? [{ width: 300, height: 300, crop: 'fill' }]
          : [{ quality: 'auto' }])
      ]
    });
  
    return result.secure_url;
  } catch (uploadError) {
    console.log("Cloudinary upload error:", uploadError);
    return res.status(500).json({ msg: "Failed to upload avatar" });
  }
};
