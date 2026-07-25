const express = require("express");
const router = express.Router();
const path = require("path");
const Job = require("../models/Job");
const User = require("../models/user");
const { matchResumeToJob } = require("../utils/resumeMatcher");
const { verifyToken, verifyRole } = require("../middleware/authMiddleware");

router.post("/match/:jobId/:candidateId", verifyToken, verifyRole("company", "admin"), async (req, res) => {
  try {
    const { jobId, candidateId } = req.params;

    const job = await Job.findById(jobId);
    const candidate = await User.findById(candidateId);

    if (!job || !candidate) {
      return res.status(404).json({
        success: false,
        message: "Job or Candidate not found",
      });
    }

    if (!candidate.resume) {
      return res.status(400).json({
        success: false,
        message: "Candidate has not uploaded a resume",
      });
    }

    const resumePath = path.join(__dirname, "..", candidate.resume);

    const matchData = await matchResumeToJob({
      resumePath,
      jobTitle: job.title,
      jobDescription: job.description,
    });

    if (!matchData) {
      return res.status(500).json({
        success: false,
        message: "AI matching failed. Please try again.",
      });
    }

    res.json({
      success: true,
      ...matchData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;