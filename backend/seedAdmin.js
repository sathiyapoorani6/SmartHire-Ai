require("dotenv").config();
const connectDB = require("./config/db");
const bcrypt = require("bcrypt");
const User = require("./models/user");

const createAdmin = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@smarthire.com" });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists!");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new User({
      name: "Super Admin",
      email: "admin@smarthire.com",
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();

    console.log("✅ Admin Created Successfully!");
    console.log("Email: admin@smarthire.com");
    console.log("Password: admin123");

    process.exit();
  } catch (error) {
    console.log("❌ Error:", error.message);
    process.exit(1);
  }
};

createAdmin();