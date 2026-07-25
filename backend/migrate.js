const mongoose = require("mongoose");
const Job = require("./models/Job");

const MONGO_URI = "mongodb://localhost:27017/smarthire_ai";

async function migrateApplicants() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected for migration...");

    const jobs = await Job.find({});
    let updatedCount = 0;

    for (const job of jobs) {
      let needsUpdate = false;

      const newApplicants = job.applicants.map((applicant) => {
        // Already migrated ah nu check pannuradhu (already object aa irundha skip)
        if (applicant && applicant.candidate) {
          return applicant;
        }
        needsUpdate = true;
        return {
          candidate: applicant,
          status: "Applied",
        };
      });

      if (needsUpdate) {
        job.applicants = newApplicants;
        await job.save();
        updatedCount++;
        console.log(`Migrated job: ${job.title}`);
      }
    }

    console.log(`\nMigration complete! ${updatedCount} jobs updated.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateApplicants();