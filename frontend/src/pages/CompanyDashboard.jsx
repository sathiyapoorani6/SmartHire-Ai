import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { isTokenExpired } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "https://smarthire-ai-kswb.onrender.com";

function CompanyDashboard() {
  const [user, setUser] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1);
  const [jobsTotalPages, setJobsTotalPages] = useState(1);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [toast, setToast] = useState(null); // {message, type}

  // Interview scheduling state: track date/mode per applicant
  const [interviewForms, setInterviewForms] = useState({});

  // AI score filter (applies across job cards)
  const [minScoreFilter, setMinScoreFilter] = useState(0);

  // Tracks which job's "Rank All Applicants" call is currently in flight
  const [rankingJobId, setRankingJobId] = useState(null);

  const toastTimerRef = useRef(null);
  const showToast = (message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Logs the user out and sends them back to login, with an optional reason message
  const forceLogout = (reason) => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    if (reason) showToast(reason, "error");
    navigate("/company");
  };

  // Reads the token error out of an axios error and force-logs-out on 401
  const handleAuthError = (err, fallbackMessage) => {
    if (err.response?.status === 401) {
      forceLogout(err.response?.data?.message || "Session expired. Please login again.");
      return true;
    }
    showToast(err.response?.data?.message || fallbackMessage, "error");
    return false;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/company");
      return;
    }

    if (isTokenExpired(token)) {
      forceLogout("Session expired. Please login again.");
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchMyJobs(parsedUser.id);

    // Check every minute in case the tab is left open past expiry
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem("token");
      if (!currentToken || isTokenExpired(currentToken)) {
        forceLogout("Session expired. Please login again.");
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchMyJobs = async (companyId, page = 1) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `${API_URL}/api/jobs/company/${companyId}?page=${page}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } } // 👈 was missing — this route requires auth
      );
      setMyJobs(res.data.jobs);
      setJobsTotalPages(res.data.totalPages || 1);
      setJobsCurrentPage(res.data.currentPage || 1);
    } catch (err) {
      if (err.response?.status === 401) {
        forceLogout(err.response?.data?.message || "Session expired. Please login again.");
        return;
      }
      console.log(err);
    }
  };

  const handleLogout = () => {
    forceLogout(null);
  };
const viewResume = async (candidateId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/api/users/resume/${candidateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        showToast("Unable to load resume", "error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      showToast("Unable to load resume", "error");
      console.log(err);
    }
  };
  const postJob = async () => {
    const token = localStorage.getItem("token");
    setIsPosting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/jobs/post`,
        {
          title: title,
          description: description,
          company: user.name,
          location: location,
          salary: salary,
          postedBy: user.id,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(res.data.message || "Job posted successfully ✅", "success");

      setTitle("");
      setDescription("");
      setLocation("");
      setSalary("");

      fetchMyJobs(user.id);
    } catch (err) {
      handleAuthError(err, "Job Posting Failed");
    } finally {
      setIsPosting(false);
    }
  };

  const handleFormChange = (applicantId, field, value) => {
    setInterviewForms((prev) => ({
      ...prev,
      [applicantId]: {
        ...prev[applicantId],
        [field]: value,
      },
    }));
  };

  const scheduleInterview = async (jobId, candidateId) => {
    const form = interviewForms[candidateId];

    if (!form?.interviewDate) {
      showToast("Please select an interview date", "error");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await axios.put(
        `${API_URL}/api/jobs/schedule-interview/${jobId}`,
        {
          candidateId,
          interviewDate: form.interviewDate,
          interviewMode: form.interviewMode || "Online",
          interviewNotes: form.interviewNotes || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(res.data.message || "Interview scheduled ✅", "success");
      fetchMyJobs(user.id, jobsCurrentPage);
    } catch (err) {
      handleAuthError(err, "Failed to schedule interview");
    }
  };

  const updateStatus = async (jobId, candidateId, status) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.put(
        `${API_URL}/api/jobs/update-status/${jobId}`,
        { candidateId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(res.data.message || "Status updated ✅", "success");
      fetchMyJobs(user.id, jobsCurrentPage);
    } catch (err) {
      handleAuthError(err, "Failed to update status");
    }
  };

  // Auto-ranks every applicant for a job: scores anyone missing an AI
  // matchScore, then refreshes the job list so cards re-sort by score.
  const rankApplicants = async (jobId) => {
    const token = localStorage.getItem("token");
    setRankingJobId(jobId);
    try {
      const res = await axios.post(
        `${API_URL}/api/match/rank/${jobId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(res.data.message || "Applicants ranked ✅", "success");
      fetchMyJobs(user.id, jobsCurrentPage);
    } catch (err) {
      handleAuthError(err, "Failed to rank applicants");
    } finally {
      setRankingJobId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="container">
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            padding: "12px 20px",
            borderRadius: "8px",
            color: "#fff",
            backgroundColor: toast.type === "success" ? "#22c55e" : "#ef4444",
            zIndex: 1000,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="card">
        <h1>Welcome, {user.name} 🏢</h1>
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>

        <br />
        <button onClick={handleLogout}>Logout</button>

        <hr style={{ margin: "20px 0" }} />

        <h2>Post a New Job</h2>

        <input
          type="text"
          placeholder="Job Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <br />
        <br />

        <textarea
          placeholder="Job Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{ width: "100%" }}
        />

        <br />
        <br />

        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <br />
        <br />

        <input
          type="text"
          placeholder="Salary (optional)"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />

        <br />
        <br />

        <button onClick={postJob} disabled={isPosting}>
          {isPosting ? "Posting..." : "Post Job"}
        </button>

        <hr style={{ margin: "20px 0" }} />

        <h2>My Posted Jobs & Applicants</h2>

        {myJobs.length === 0 && <p>You haven't posted any jobs yet.</p>}

        {myJobs.map((job) => {
          // Sort applicants by AI match score (highest first)
          const sortedApplicants = [...job.applicants].sort(
            (a, b) => (b.matchScore || 0) - (a.matchScore || 0)
          );

          // Filter by minimum score
          const filteredApplicants = sortedApplicants.filter(
            (a) => (a.matchScore ?? 0) >= minScoreFilter
          );

          return (
            <div
              key={job._id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "15px",
                textAlign: "left",
              }}
            >
              <h3>{job.title}</h3>
              <p><b>Location:</b> {job.location}</p>
              <p><b>Salary:</b> {job.salary}</p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px",
                }}
              >
                <h4 style={{ margin: 0 }}>
                  Applicants ({filteredApplicants.length} of {job.applicants.length})
                </h4>

                {job.applicants.length > 0 && (
                  <button
                    onClick={() => rankApplicants(job._id)}
                    disabled={rankingJobId === job._id}
                    style={{
                      background: "#1565c0",
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: rankingJobId === job._id ? "not-allowed" : "pointer",
                      opacity: rankingJobId === job._id ? 0.7 : 1,
                    }}
                  >
                    {rankingJobId === job._id ? "Ranking..." : "🤖 Rank All Applicants"}
                  </button>
                )}

                <label style={{ fontSize: "14px" }}>
                  Min AI Score:{" "}
                  <select
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                  >
                    <option value={0}>All</option>
                    <option value={40}>40%+</option>
                    <option value={60}>60%+</option>
                    <option value={70}>70%+</option>
                    <option value={80}>80%+</option>
                  </select>
                </label>
              </div>

              {job.applicants.length === 0 && <p>No applicants yet.</p>}

              {job.applicants.length > 0 && filteredApplicants.length === 0 && (
                <p><i>No candidates match this score filter.</i></p>
              )}

              {filteredApplicants.map((applicant) => {
                const candidate = applicant.candidate;
                if (!candidate) return null;

               const form = interviewForms[candidate._id] || {};

                const scoreColor =
                  applicant.matchScore >= 70
                    ? "#2e7d32"
                    : applicant.matchScore >= 40
                    ? "#f9a825"
                    : "#c62828";

                return (
                  <div
                    key={candidate._id}
                    style={{
                      background: "#f5f5f5",
                      padding: "10px",
                      borderRadius: "6px",
                      marginBottom: "8px",
                    }}
                  >
                    <p><b>Name:</b> {candidate.name}</p>
                    <p><b>Email:</b> {candidate.email}</p>
                    <p><b>Status:</b> {applicant.status}</p>

                    {candidate.resume ? (
                      <button onClick={() => viewResume(candidate._id)}>
                        View Resume
                      </button>
                    ) : (
                      <p><i>No resume uploaded</i></p>
                    )}

                    {/* AI Match Score Section */}
                    {applicant.matchScore !== undefined && applicant.matchScore !== null && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "10px",
                          background: "#fff",
                          borderRadius: "6px",
                          border: `1px solid ${scoreColor}`,
                        }}
                      >
                        <p style={{ margin: "0 0 6px 0" }}>
                          <b>🤖 AI Match Score: </b>
                          <span style={{ color: scoreColor, fontWeight: "bold" }}>
                            {applicant.matchScore}%
                          </span>
                        </p>

                        {applicant.matchingSkills?.length > 0 && (
                          <p style={{ margin: "4px 0" }}>
                            <b>✅ Matching Skills: </b>
                            {applicant.matchingSkills.join(", ")}
                          </p>
                        )}

                        {applicant.missingSkills?.length > 0 && (
                          <p style={{ margin: "4px 0" }}>
                            <b>❌ Missing Skills: </b>
                            {applicant.missingSkills.join(", ")}
                          </p>
                        )}

                        {applicant.aiSummary && (
                          <p style={{ margin: "4px 0", fontStyle: "italic" }}>
                            "{applicant.aiSummary}"
                          </p>
                        )}
                      </div>
                    )}

                    <br />

                    {applicant.status === "Interview Scheduled" ? (
                      <p>
                        <b>Interview:</b>{" "}
                        {new Date(applicant.interviewDate).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}{" "}
                        ({applicant.interviewMode})
                      </p>
                    ) : (
                      applicant.status !== "Selected" &&
                      applicant.status !== "Rejected" && (
                        <div>
                          <label>Interview Date & Time: </label>
                          <input
                            type="datetime-local"
                            value={form.interviewDate || ""}
                            onChange={(e) =>
                              handleFormChange(candidate._id, "interviewDate", e.target.value)
                            }
                          />

                          <br />
                          <br />

                          <label>Mode: </label>
                          <select
                            value={form.interviewMode || "Online"}
                            onChange={(e) =>
                              handleFormChange(candidate._id, "interviewMode", e.target.value)
                            }
                          >
                            <option value="Online">Online</option>
                            <option value="Offline">Offline</option>
                          </select>

                          <br />
                          <br />

                          <button onClick={() => scheduleInterview(job._id, candidate._id)}>
                            Schedule Interview
                          </button>
                        </div>
                      )
                    )}

                    {/* Select / Reject controls */}
                    {applicant.status !== "Selected" && applicant.status !== "Rejected" && (
                      <div style={{ marginTop: "10px" }}>
                        <button
                          style={{
                            background: "#2e7d32",
                            color: "#fff",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            marginRight: "8px",
                            cursor: "pointer",
                          }}
                          onClick={() => updateStatus(job._id, candidate._id, "Selected")}
                        >
                          Select
                        </button>
                        <button
                          style={{
                            background: "#c62828",
                            color: "#fff",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                          onClick={() => updateStatus(job._id, candidate._id, "Rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {(applicant.status === "Selected" || applicant.status === "Rejected") && (
                      <p style={{ marginTop: "10px", fontWeight: "bold" }}>
                        Final Status: {applicant.status}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {myJobs.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "20px 0" }}>
            <button
              onClick={() => fetchMyJobs(user.id, jobsCurrentPage - 1)}
              disabled={jobsCurrentPage <= 1}
            >
              ⬅ Prev
            </button>
            <span>Page {jobsCurrentPage} of {jobsTotalPages}</span>
            <button
              onClick={() => fetchMyJobs(user.id, jobsCurrentPage + 1)}
              disabled={jobsCurrentPage >= jobsTotalPages}
            >
              Next ➡
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyDashboard;
