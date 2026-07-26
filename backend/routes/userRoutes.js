const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");
const upload = require("../config/multerConfig");
const { verifyToken } = require("../middleware/authMiddleware");
const { sendResetPasswordEmail } = require("../utils/sendEmail");

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

// Forgot Password - generates a reset token and emails a reset link
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail, role });

    // Always respond with success, even if the user doesn't exist,
    // so we don't reveal which emails are registered.
    if (!user) {
      return res.json({
        success: true,
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }

    // Generate a random token; store only its hash in the DB
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "https://smart-hire-ai-lac.vercel.app";
    const resetLink = `${frontendUrl}/reset-password/${rawToken}?role=${role}`;

    await sendResetPasswordEmail({
      toEmail: user.email,
      name: user.name,
      resetLink,
    });

    res.json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Reset Password - verifies the token and sets a new password
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password, role } = req.body;
    const { token } = req.params;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
      role,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired. Please request a new one.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
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

    // Resume is now stored on Cloudinary; stream it through this route so the
    // existing frontend fetch()+blob flow (with auth header) keeps working unchanged.
    const https = require("https");
    https
      .get(targetUser.resume, (fileRes) => {
        res.setHeader(
          "Content-Type",
          fileRes.headers["content-type"] || "application/octet-stream"
        );
        fileRes.pipe(res);
      })
      .on("error", () => {
        res.status(500).json({
          success: false,
          message: "Failed to load resume",
        });
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


module.exports = router;
