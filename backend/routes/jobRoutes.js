const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const User = require("../models/user");
const sendApplicationEmail = require("../utils/sendEmail");
const Notification = require("../models/Notification");
const { matchResumeToJob } = require("../utils/resumeMatcher");
const { verifyToken, verifyRole } = require("../middleware/authMiddleware");

// Post a new Job — postedBy comes from the token, never trust client input for this
router.post("/post", verifyToken, verifyRole("company"), async (req, res) => {
  try {
    const { title, description, company, location, salary } = req.body;

    const newJob = new Job({
      title,
      description,
      company,
      location,
      salary,
      postedBy: req.user.id, // 👈 from JWT, not req.body
    });

    await newJob.save();

    res.json({
      success: true,
      message: "Job Posted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalJobs = await Job.countDocuments();
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      jobs,
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Apply for a Job — candidateId comes from the token, never trust client input for this
router.post("/apply/:jobId", verifyToken, verifyRole("candidate"), async (req, res) => {
  try {
    const { jobId } = req.params;
    const candidateId = req.user.id; // 👈 from JWT, not req.body

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const alreadyApplied = job.applicants.some(
      (a) => a.candidate.toString() === candidateId
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: "You already applied for this job",
      });
    }

    const candidate = await User.findById(candidateId);

    const newApplicant = {
      candidate: candidateId,
      status: "Applied",
    };

    if (candidate?.resume) {
      // candidate.resume is a Cloudinary URL — pass it straight through,
      // matchResumeToJob expects resumeUrl, not a local file path
      const aiResult = await matchResumeToJob({
        resumeUrl: candidate.resume,
        jobTitle: job.title,
        jobDescription: job.description,
      });

      if (aiResult) {
        newApplicant.matchScore = aiResult.matchScore;
        newApplicant.matchingSkills = aiResult.matchingSkills;
        newApplicant.missingSkills = aiResult.missingSkills;
        newApplicant.aiSummary = aiResult.summary;
      }
    }

    job.applicants.push(newApplicant);
    await job.save();

    const company = await User.findById(job.postedBy);

    if (company?.email) {
      sendApplicationEmail({
        companyEmail: company.email,
        candidateName: candidate?.name || "A candidate",
        jobTitle: job.title,
      });
    }

    res.json({
      success: true,
      message: "Applied Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get jobs posted by a specific company — only that company (or admin) can view
router.get("/company/:companyId", verifyToken, verifyRole("company", "admin"), async (req, res) => {
  try {
    const { companyId } = req.params;

    // A company can only ever see its own jobs, not another company's
    if (req.user.role === "company" && req.user.id !== companyId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own company's jobs",
      });
    }

    const jobs = await Job.find({ postedBy: companyId })
      .populate("applicants.candidate", "name email resume")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Schedule Interview — only the company that owns this job can do this
router.put("/schedule-interview/:jobId", verifyToken, verifyRole("company"), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { candidateId, interviewDate, interviewMode, interviewNotes } = req.body;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // 👇 Ownership check — this company must be the one who posted the job
    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this job",
      });
    }

    const applicant = job.applicants.find(
      (a) => a.candidate.toString() === candidateId
    );

    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: "Candidate has not applied for this job",
      });
    }

    applicant.status = "Interview Scheduled";
    applicant.interviewDate = interviewDate;
    applicant.interviewMode = interviewMode;
    applicant.interviewNotes = interviewNotes || "";

    await job.save();

    const candidate = await User.findById(candidateId);
    if (candidate?.email) {
      sendApplicationEmail({
        companyEmail: candidate.email,
        candidateName: candidate.name || "Candidate",
        jobTitle: job.title,
        isInterview: true,
        interviewDate,
        interviewMode,
      });
    }

    await Notification.create({
      recipient: candidateId,
      message: `Interview scheduled for "${job.title}" — check your dashboard for details.`,
      jobTitle: job.title,
    });

    res.json({
      success: true,
      message: "Interview Scheduled Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update applicant status — only the company that owns this job can do this
router.put("/update-status/:jobId", verifyToken, verifyRole("company"), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { candidateId, status } = req.body;

    const validStatuses = ["Applied", "Interview Scheduled", "Rejected", "Selected"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // 👇 Ownership check — this company must be the one who posted the job
    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify this job",
      });
    }

    const applicant = job.applicants.find(
      (a) => a.candidate.toString() === candidateId
    );

    if (!applicant) {
      return res.status(404).json({
        success: false,
        message: "Candidate has not applied for this job",
      });
    }

    // Already in this status — likely a double-click or retry. Don't
    // re-send the email or create a duplicate notification.
    if (applicant.status === status) {
      return res.json({
        success: true,
        message: `Status already set to ${status}`,
      });
    }

    applicant.status = status;
    await job.save();

    const candidate = await User.findById(candidateId);
    if (candidate?.email && (status === "Selected" || status === "Rejected")) {
      sendApplicationEmail({
        companyEmail: candidate.email,
        candidateName: candidate.name || "Candidate",
        jobTitle: job.title,
        isStatusUpdate: true,
        newStatus: status,
      });
    }

    if (status === "Selected" || status === "Rejected") {
      const message =
        status === "Selected"
          ? `Congrats! You were selected for "${job.title}" 🎉`
          : `Update on "${job.title}": your application was not selected this time.`;

      await Notification.create({
        recipient: candidateId,
        message,
        jobTitle: job.title,
      });
    }

    res.json({
      success: true,
      message: `Status updated to ${status}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
