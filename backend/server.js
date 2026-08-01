const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first'); // avoid ENETUNREACH errors over IPv6 on Render
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const jobRoutes = require("./routes/jobRoutes");
const app = express();
const matchRoutes = require("./routes/matchRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
// Connect MongoDB
connectDB();

// Make sure the uploads folder exists before multer tries to write resumes into it
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: "https://smart-hire-ai-lac.vercel.app",
  credentials: true
}));
app.use(express.json());
// Resumes are served through an authenticated route below, not as static files
app.use("/api/admin", adminRoutes);
// Test Route
app.get("/", (req, res) => {
  res.send("Welcome to SmartHire AI Backend 🚀");
});

// Test API
app.get("/api/message", (req, res) => {
  res.json({
    message: "Hello from SmartHire AI Backend 🚀",
  });
});

// User Routes
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/notifications", notificationRoutes);

// 👇 Global error handler - catches multer errors (bad file type / too large)
// and any other error passed via next(err), so the frontend always gets clean JSON
// instead of a raw stack trace / HTML crash page.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File is too large. Maximum size allowed is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err.message === "Only PDF/DOC/DOCX files are allowed") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  console.error(err); // still log full error for you to debug
  res.status(500).json({
    success: false,
    message: "Something went wrong on the server.",
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
