const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    return {
      folder: "smarthire-resumes",
      resource_type: "raw", // needed for PDF/DOC/DOCX (not an image)
      format: ext, // keep the original file extension
      public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
    };
  },
});

module.exports = { cloudinary, storage };