const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
async function sendApplicationEmail({
  companyEmail,
  candidateName,
  jobTitle,
  isInterview,
  interviewDate,
  interviewMode,
  isStatusUpdate,
  newStatus,
}) {
  try {
    let subject, html;

   if (isStatusUpdate) {
      const isSelected = newStatus === "Selected";

      subject = isSelected
        ? `Congratulations! You've been selected for ${jobTitle}`
        : `Update on your application for ${jobTitle}`;

      html = isSelected
        ? `
        <h2>Congratulations, ${candidateName}!</h2>
        <p>We're pleased to inform you that you have been <strong>selected</strong> for the position of <strong>${jobTitle}</strong>.</p>
        <p>Log in to your SmartHire AI dashboard for more details.</p>
      `
        : `
        <h2>Application Update</h2>
        <p>Hi <strong>${candidateName}</strong>,</p>
        <p>Thank you for applying for the position of <strong>${jobTitle}</strong>. After careful review, we have decided to move forward with other candidates at this time.</p>
        <p>We encourage you to apply for other openings on SmartHire AI.</p>
      `;
    } else if (isInterview) {
      const formattedDate = interviewDate
        ? new Date(interviewDate).toLocaleString("en-IN", {
            dateStyle: "full",
            timeStyle: "short",
          })
        : "To be confirmed";

      subject = `Interview Scheduled for ${jobTitle}`;
      html = `
        <h2>Interview Scheduled</h2>
        <p>Hi <strong>${candidateName}</strong>,</p>
        <p>Your interview for the position of <strong>${jobTitle}</strong> has been scheduled.</p>
        <ul>
          <li><strong>Date & Time:</strong> ${formattedDate}</li>
          <li><strong>Mode:</strong> ${interviewMode || "Not specified"}</li>
        </ul>
        <p>Log in to your SmartHire AI dashboard for more details.</p>
      `;
    } else {
      subject = `New Application for ${jobTitle}`;
      html = `
        <h2>New Job Application Received</h2>
        <p><strong>${candidateName}</strong> has applied for the position of <strong>${jobTitle}</strong>.</p>
        <p>Log in to your SmartHire AI dashboard to view the candidate's resume and AI match score.</p>
      `;
    }

    await transporter.sendMail({
      from: `"SmartHire AI" <${process.env.EMAIL_USER}>`,
      to: companyEmail,
      subject,
      html,
    });

    console.log("Email sent to", companyEmail);
  } catch (error) {
    console.log("Email sending failed:", error.message);
  }
}

async function sendResetPasswordEmail({ toEmail, name, resetLink }) {
  try {
    await transporter.sendMail({
      from: `"SmartHire AI" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Reset your SmartHire AI password",
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi <strong>${name || "there"}</strong>,</p>
        <p>We received a request to reset your SmartHire AI password. Click the link below to set a new password. This link is valid for 30 minutes.</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#6b1f2a;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    console.log("Password reset email sent to", toEmail);
  } catch (error) {
    console.log("Password reset email sending failed:", error.message);
  }
}

module.exports = sendApplicationEmail;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;
