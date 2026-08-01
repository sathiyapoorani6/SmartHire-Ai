const https = require("https");
const path = require("path");
const mammoth = require("mammoth");
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Downloads a file from a URL (e.g. Cloudinary) into memory as a Buffer.
// Follows redirects (3xx) up to a small limit, since Cloudinary/CDNs can
// redirect and the old version silently returned an empty/garbled buffer.
function downloadBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          redirectsLeft > 0
        ) {
          res.resume(); // discard this response body
          return resolve(downloadBuffer(res.headers.location, redirectsLeft - 1));
        }

        if (res.statusCode >= 400) {
          return reject(new Error(`Failed to download resume: HTTP ${res.statusCode}`));
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

// Extracts plain text from a resume file — supports PDF and DOCX/DOC.
// resumeUrl is now a Cloudinary URL rather than a local disk path.
async function extractResumeText(resumeUrl) {
  const ext = path.extname(resumeUrl.split("?")[0]).toLowerCase();
  const buffer = await downloadBuffer(resumeUrl);

  if (ext === ".pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  } else if (ext === ".docx" || ext === ".doc") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else {
    throw new Error("Unsupported resume file format");
  }
}

// Compares a resume against a job description using Gemini and returns a match report
async function matchResumeToJob({ resumeUrl, jobTitle, jobDescription }) {
  try {
    const resumeText = await extractResumeText(resumeUrl);

    if (!resumeText) {
      return null;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `You are an AI recruiter assistant. Compare the candidate's resume with the job description below.

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}

CANDIDATE RESUME:
${resumeText}

Respond ONLY in this exact JSON format, with no extra text, no markdown, no backticks:
{
  "matchScore": <number between 0-100>,
  "matchingSkills": [<array of skills from resume that match the job>],
  "missingSkills": [<array of important skills the job needs but resume lacks>],
  "summary": "<one or two sentence summary of the candidate's fit>"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanText = responseText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    console.log("✅ AI Screening Success:", parsed);
    return parsed;
  } catch (error) {
    console.log("Resume matching failed:", error.message);
    return null;
  }
}

module.exports = { matchResumeToJob, extractResumeText };
