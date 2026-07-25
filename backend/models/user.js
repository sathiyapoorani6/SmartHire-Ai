const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  resume: {
    type: String,
    default: "",
  },
  approved: {
    type: Boolean,
    default: true, // candidates/admins are approved by default; companies get set to false at registration
  },
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);