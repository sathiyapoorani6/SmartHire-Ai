require("dotenv").config();
const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const User = require("./models/user");

// 👇 Reads credentials from .env so the same script can't create a
// well-known admin/admin123 account on every deployment. Falls back to
// the old defaults only for local dev, with a loud warning.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@smarthire.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";

const createAdmin = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");

    if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) {
      console.log(
        "⚠️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set in .env — using default dev credentials. Do NOT run this in production without setting them."
      );
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists!");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = new User({
      name: "Super Admin",
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();

    console.log("✅ Admin Created Successfully!");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log("Password: (the one you set in SEED_ADMIN_PASSWORD)");

    process.exit();
  } catch (error) {
    console.log("❌ Error:", error.message);
    process.exit(1);
  }
};

createAdmin();
