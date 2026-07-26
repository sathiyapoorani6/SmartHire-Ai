const multer = require("multer");
const path = require("path");

const allowedMimeTypes = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

const upload = multer({
  storage: multer.memoryStorage(), // keep file in memory; route handler uploads it to Cloudinary
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedExts = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();

    // Check both extension AND actual MIME type — a renamed .exe won't pass this
    if (allowedExts.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF/DOC/DOCX files are allowed"));
    }
  },
});

module.exports = upload;
