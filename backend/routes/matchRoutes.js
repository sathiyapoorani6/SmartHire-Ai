const express = require("express");
const router = express.Router();
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

    const matchData = await matchResumeToJob({
      resumeUrl: candidate.resume,
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

router.post("/match/rank/:jobId", verifyToken, verifyRole("company", "admin"), async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId).populate(
      "applicants.candidate",
      "name email resume"
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (req.user.role === "company" && job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to rank applicants for this job",
      });
    }

    for (const applicant of job.applicants) {
      const hasScore = typeof applicant.matchScore === "number";
      const candidate = applicant.candidate;

      if (hasScore || !candidate?.resume) continue;

      const matchData = await matchResumeToJob({
        resumeUrl: candidate.resume,
        jobTitle: job.title,
        jobDescription: job.description,
      });

      if (matchData) {
        applicant.matchScore = matchData.matchScore;
        applicant.matchingSkills = matchData.matchingSkills;
        applicant.missingSkills = matchData.missingSkills;
        applicant.aiSummary = matchData.summary;
      }
    }

    await job.save();

    const ranked = [...job.applicants].sort(
      (a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1)
    );

    res.json({
      success: true,
      applicants: ranked,
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
