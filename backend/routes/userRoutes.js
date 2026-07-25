const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const upload = require("../config/multerConfig");
const { verifyToken } = require("../middleware/authMiddleware");

// Register User
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 👇 Companies need admin approval before they can log in; everyone else is auto-approved
    const isApproved = role !== "company";

    const newUser = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      approved: isApproved,
    });

    await newUser.save();

    res.json({
      success: true,
      message:
        role === "company"
          ? "Registered! Your account is pending admin approval."
          : "User Registered Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Login User
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    // Check role match (candidate/company/admin)
    if (user.role !== role) {
      return res.status(400).json({
        success: false,
        message: "Role mismatch. Please check login type.",
      });
    }

    // Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // 👇 Block company login until admin approves the account
    if (user.role === "company" && !user.approved) {
      return res.status(403).json({
        success: false,
        message: "Your company account is pending admin approval.",
      });
    }

    // Generate a JWT for the session - expires in 1 hour
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Upload Resume - protected, candidate must send a valid token
router.post("/upload-resume/:userId", verifyToken, upload.single("resume"), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.resume = req.file.path.replace(/\\/g, "/");
    await user.save();

    res.json({
      success: true,
      message: "Resume Uploaded Successfully",
      resumePath: req.file.path,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// Serve a candidate's resume — only that candidate, or a company/admin, can access it
router.get("/resume/:userId", verifyToken, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);

    if (!targetUser || !targetUser.resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    const isOwner = req.user.id === req.params.userId;
    const isCompanyOrAdmin = req.user.role === "company" || req.user.role === "admin";

    if (!isOwner && !isCompanyOrAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this resume",
      });
    }

    const path = require("path");
    const resumePath = path.join(__dirname, "..", targetUser.resume);
    res.sendFile(resumePath);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


module.exports = router;
