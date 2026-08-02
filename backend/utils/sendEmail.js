const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4, // force IPv4 — Render's network can't reach Gmail over IPv6
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const DASHBOARD_URL = process.env.FRONTEND_URL || "https://smart-hire-ai-lac.vercel.app";
const BRAND_COLOR = "#6b1f2a";

// Wraps any inner content in a consistent, professional card layout —
// branded header, white content card, CTA button, footer.
function wrapEmailTemplate({ preheader = "", bodyHtml, badge = null }) {
  const badgeHtml = badge
    ? `<span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.3px;background:${badge.bg};color:${badge.color};margin-bottom:16px;">${badge.text}</span>`
    : "";

  return `
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;font-family:'Segoe UI',Arial,sans-serif;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${BRAND_COLOR};padding:22px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">SmartHire AI</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${badgeHtml}
              ${bodyHtml}
              <div style="margin-top:28px;">
                <a href="${DASHBOARD_URL}" style="display:inline-block;padding:11px 24px;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background:#fafafa;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#9a9a9a;">
                This is an automated email from SmartHire AI. Please don't reply to this address.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

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
        ? `🎉 You've been selected for ${jobTitle}`
        : `Update on your application for ${jobTitle}`;

      html = wrapEmailTemplate({
        preheader: isSelected
          ? `Congratulations! You've been selected for ${jobTitle}.`
          : `An update on your application for ${jobTitle}.`,
        badge: isSelected
          ? { text: "SELECTED", bg: "#e6f4ea", color: "#1e7d34" }
          : { text: "APPLICATION UPDATE", bg: "#f2f2f2", color: "#666666" },
        bodyHtml: isSelected
          ? `
            <h2 style="margin:0 0 12px 0;font-size:20px;color:#222;">Congratulations, ${candidateName}! 🎉</h2>
            <p style="margin:0 0 8px 0;font-size:15px;color:#444;line-height:1.6;">
              We're pleased to inform you that you have been <strong>selected</strong> for the position of
              <strong>${jobTitle}</strong>.
            </p>
            <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">
              Please log in to your dashboard for next steps and further details from the hiring team.
            </p>
          `
          : `
            <h2 style="margin:0 0 12px 0;font-size:20px;color:#222;">Hi ${candidateName},</h2>
            <p style="margin:0 0 8px 0;font-size:15px;color:#444;line-height:1.6;">
              Thank you for applying for the position of <strong>${jobTitle}</strong>. After careful review,
              we've decided to move forward with other candidates at this time.
            </p>
            <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">
              We encourage you to keep an eye out for other openings on SmartHire AI that match your profile.
            </p>
          `,
      });
    } else if (isInterview) {
      const formattedDate = interviewDate
        ? new Date(interviewDate).toLocaleString("en-IN", {
            dateStyle: "full",
            timeStyle: "short",
          })
        : "To be confirmed";

      subject = `📅 Interview Scheduled — ${jobTitle}`;
      html = wrapEmailTemplate({
        preheader: `Your interview for ${jobTitle} has been scheduled.`,
        badge: { text: "INTERVIEW SCHEDULED", bg: "#e8f0fe", color: "#1a56c4" },
        bodyHtml: `
          <h2 style="margin:0 0 12px 0;font-size:20px;color:#222;">Hi ${candidateName},</h2>
          <p style="margin:0 0 16px 0;font-size:15px;color:#444;line-height:1.6;">
            Good news — your interview for the position of <strong>${jobTitle}</strong> has been scheduled.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border-radius:8px;margin-bottom:8px;">
            <tr>
              <td style="padding:14px 18px;font-size:14px;color:#555;border-bottom:1px solid #eee;">
                <strong style="color:#222;">Date & Time</strong><br/>${formattedDate}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 18px;font-size:14px;color:#555;">
                <strong style="color:#222;">Mode</strong><br/>${interviewMode || "Not specified"}
              </td>
            </tr>
          </table>
        `,
      });
    } else {
      subject = `New Application — ${jobTitle}`;
      html = wrapEmailTemplate({
        preheader: `${candidateName} applied for ${jobTitle}.`,
        badge: { text: "NEW APPLICATION", bg: "#fff4e5", color: "#b26a00" },
        bodyHtml: `
          <h2 style="margin:0 0 12px 0;font-size:20px;color:#222;">New Job Application Received</h2>
          <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">
            <strong>${candidateName}</strong> has applied for the position of <strong>${jobTitle}</strong>.
            Log in to your dashboard to view the candidate's resume and AI match score.
          </p>
        `,
      });
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
    const html = wrapEmailTemplate({
      preheader: "Reset your SmartHire AI password.",
      bodyHtml: `
        <h2 style="margin:0 0 12px 0;font-size:20px;color:#222;">Password Reset Request</h2>
        <p style="margin:0 0 8px 0;font-size:15px;color:#444;line-height:1.6;">
          Hi <strong>${name || "there"}</strong>, we received a request to reset your SmartHire AI password.
        </p>
        <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">
          Click the button below to set a new password. This link is valid for 30 minutes. If you didn't
          request this, you can safely ignore this email.
        </p>
      `,
    }).replace(
      `href="${DASHBOARD_URL}" style="display:inline-block;padding:11px 24px;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
                  Go to Dashboard`,
      `href="${resetLink}" style="display:inline-block;padding:11px 24px;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
                  Reset Password`
    );

    await transporter.sendMail({
      from: `"SmartHire AI" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Reset your SmartHire AI password",
      html,
    });

    console.log("Password reset email sent to", toEmail);
  } catch (error) {
    console.log("Password reset email sending failed:", error.message);
  }
}

module.exports = sendApplicationEmail;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;
