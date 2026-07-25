const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Extracts plain text from a resume file — supports PDF and DOCX/DOC
async function extractResumeText(resumePath) {
  const ext = path.extname(resumePath).toLowerCase();

  if (ext === ".pdf") {
    const dataBuffer = fs.readFileSync(resumePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else if (ext === ".docx" || ext === ".doc") {
    const result = await mammoth.extractRawText({ path: resumePath });
    return result.value;
  } else {
    throw new Error("Unsupported resume file format");
  }
}

// Compares a resume against a job description using Gemini and returns a match report
async function matchResumeToJob({ resumePath, jobTitle, jobDescription }) {
  try {
    const resumeText = await extractResumeText(resumePath);

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