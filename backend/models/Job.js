const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    salary: {
      type: String,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicants: [
      {
        candidate: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        status: {
          type: String,
          enum: ["Applied", "Interview Scheduled", "Rejected", "Selected"],
          default: "Applied",
        },
        interviewDate: {
          type: Date,
        },
        interviewMode: {
          type: String,
        },
        interviewNotes: {
          type: String,
        },
        matchScore: {
          type: Number,
        },
        matchingSkills: {
          type: [String],
          default: [],
        },
        missingSkills: {
          type: [String],
          default: [],
        },
        aiSummary: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);