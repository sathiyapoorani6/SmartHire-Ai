const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const User = require("../models/user");
const { verifyToken, verifyRole } = require("../middleware/authMiddleware");

router.get("/stats", verifyToken, verifyRole("admin"), async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const totalCandidates = await User.countDocuments({ role: "candidate" });

    const applicationsAgg = await Job.aggregate([
      { $project: { count: { $size: { $ifNull: ["$applicants", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]);
    const totalApplications = applicationsAgg[0]?.total || 0;

    res.json({
      success: true,
      totalJobs,
      totalCandidates,
      totalApplications
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all jobs with company + applicant count (for table view)
router.get("/jobs", verifyToken, verifyRole("admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalJobs = await Job.countDocuments();
    const jobs = await Job.find()
      .populate("postedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedJobs = jobs.map((job) => ({
      _id: job._id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      postedByName: job.postedBy?.name || "N/A",
      applicantCount: job.applicants.length,
      createdAt: job.createdAt,
    }));

   res.json({
      success: true,
      jobs: formattedJobs,
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
});



router.get("/candidates", verifyToken, verifyRole("admin"), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalCandidates = await User.countDocuments({ role: "candidate" });
    const candidates = await User.find({ role: "candidate" })
      .select("name email resume createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      candidates,
      totalCandidates,
      totalPages: Math.ceil(totalCandidates / limit),
      currentPage: page,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 👇 Get companies awaiting admin approval
router.get("/pending-companies", verifyToken, verifyRole("admin"), async (req, res) => {
  try {
    const pendingCompanies = await User.find({ role: "company", approved: false })
      .select("name email createdAt")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      companies: pendingCompanies,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 👇 Approve a company so it can log in
router.post("/approve-company/:id", verifyToken, verifyRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    const company = await User.findById(id);
    if (!company || company.role !== "company") {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    company.approved = true;
    await company.save();

    res.json({
      success: true,
      message: `${company.name} approved successfully`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;