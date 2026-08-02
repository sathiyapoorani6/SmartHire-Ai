import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Decodes a JWT payload without needing any extra library.
// Returns null if the token is missing or malformed.
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch (err) {
    return null;
  }
}

function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  const nowInSeconds = Date.now() / 1000;
  return decoded.exp < nowInSeconds;
}

const API_URL = import.meta.env.VITE_API_URL || "https://smarthire-ai-kswb.onrender.com";

function CandidateDashboard() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resumeFile, setResumeFile] = useState(null);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [withdrawingJobId, setWithdrawingJobId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState(null); // {message, type}
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

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
    navigate("/candidate");
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/candidate");
      return;
    }

    // 👇 Check expiry immediately on page load - no need to wait for an API call to fail
    if (isTokenExpired(token)) {
      forceLogout("Session expired. Please login again.");
      return;
    }

    setUser(JSON.parse(storedUser));
    fetchJobs();
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const notifInterval = setInterval(fetchNotifications, 30 * 1000);

    // 👇 Also check every minute in case the tab is left open past expiry
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem("token");
      if (!currentToken || isTokenExpired(currentToken)) {
        forceLogout("Session expired. Please login again.");
      }
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(notifInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.log(err);
    }
  };

  const openNotifications = async () => {
    setShowNotifications((prev) => !prev);

    if (unreadCount > 0) {
      const token = localStorage.getItem("token");
      try {
        await axios.put(
          `${API_URL}/api/notifications/read-all`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } catch (err) {
        console.log(err);
      }
    }
  };

  const fetchJobs = async (page = 1) => {
    try {
      const res = await axios.get(
        `${API_URL}/api/jobs/all?page=${page}&limit=10`
      );
      setJobs(res.data.jobs);
      setTotalPages(res.data.totalPages || 1);
      setCurrentPage(res.data.currentPage || 1);
    } catch (err) {
      console.log(err);
    }
  };
  const handleLogout = () => {
    forceLogout(null);
  };

  const applyJob = async (jobId) => {
    const token = localStorage.getItem("token");
    setApplyingJobId(jobId);
    try {
      const res = await axios.post(
        `${API_URL}/api/jobs/apply/${jobId}`,
        {
          candidateId: user.id,
        },
        {
          headers: { Authorization: `Bearer ${token}` }, // 👈 send token
        }
      );
      showToast(res.data.message || "Applied successfully ✅", "success");
      fetchJobs(currentPage); // 👈 stay on the same page instead of bouncing back to page 1
    } catch (err) {
      if (err.response?.status === 401) {
        forceLogout(err.response?.data?.message || "Session expired. Please login again.");
        return;
      }
      showToast(err.response?.data?.message || "Apply Failed", "error");
      console.log(err);
    } finally {
      setApplyingJobId(null);
    }
  };

  const withdrawApplication = async (jobId) => {
    const token = localStorage.getItem("token");
    setWithdrawingJobId(jobId);
    try {
      const res = await axios.delete(`${API_URL}/api/jobs/withdraw/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(res.data.message || "Application withdrawn ✅", "success");
      fetchJobs(currentPage);
    } catch (err) {
      if (err.response?.status === 401) {
        forceLogout(err.response?.data?.message || "Session expired. Please login again.");
        return;
      }
      showToast(err.response?.data?.message || "Withdraw Failed", "error");
      console.log(err);
    } finally {
      setWithdrawingJobId(null);
    }
  };

  const uploadResume = async () => {
    if (!resumeFile) {
      showToast("Please select a file first", "error");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("resume", resumeFile);

    setIsUploading(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/users/upload-resume/${user.id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`, // 👈 send token
          },
        }
      );
      showToast(res.data.message || "Resume uploaded successfully ✅", "success");
    } catch (err) {
      if (err.response?.status === 401) {
        forceLogout(err.response?.data?.message || "Session expired. Please login again.");
        return;
      }
      showToast(err.response?.data?.message || "Upload Failed", "error");
      console.log(err);
    } finally {
      setIsUploading(false);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1>Welcome, {user.name} 👋</h1>
            <p>Email: {user.email}</p>
            <p>Role: {user.role}</p>
          </div>

          <div style={{ position: "relative" }}>
            <button
              onClick={openNotifications}
              style={{
                position: "relative",
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                fontSize: "18px",
              }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: "50%",
                    fontSize: "11px",
                    padding: "2px 6px",
                    fontWeight: "bold",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "48px",
                  width: "300px",
                  maxHeight: "350px",
                  overflowY: "auto",
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  textAlign: "left",
                }}
              >
                {notifications.length === 0 && (
                  <p style={{ padding: "12px", margin: 0, color: "#888" }}>
                    No notifications yet.
                  </p>
                )}
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid #eee",
                      fontSize: "14px",
                    }}
                  >
                    <p style={{ margin: 0 }}>{n.message}</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "#999" }}>
                      {new Date(n.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <br />
        <button onClick={handleLogout}>Logout</button>

        <hr style={{ margin: "20px 0" }} />

        <h2>Upload Resume</h2>

        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setResumeFile(e.target.files[0])}
        />

        <br /><br />

        <button onClick={uploadResume} disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload Resume"}
        </button>

        <hr style={{ margin: "20px 0" }} />

        <h2>Available Jobs</h2>

        {jobs.length === 0 && <p>No jobs posted yet.</p>}

        {jobs.map((job) => {
          const myApplication = job.applicants.find(
            (a) => a.candidate?.toString() === user.id?.toString()
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
              <p><b>Company:</b> {job.company}</p>
              <p><b>Location:</b> {job.location}</p>
              <p><b>Salary:</b> {job.salary}</p>
              <p>{job.description}</p>

              {!myApplication && (
                <button
                  onClick={() => applyJob(job._id)}
                  disabled={applyingJobId === job._id}
                >
                  {applyingJobId === job._id ? "Applying..." : "Apply Now"}
                </button>
              )}

              {myApplication && myApplication.status === "Applied" && (
                <div>
                  <p style={{ color: "green" }}>
                    <b>✔ Applied</b> — waiting for response
                  </p>
                  <button
                    onClick={() => withdrawApplication(job._id)}
                    disabled={withdrawingJobId === job._id}
                    style={{
                      background: "#fff",
                      color: "#c62828",
                      border: "1px solid #c62828",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      cursor: withdrawingJobId === job._id ? "not-allowed" : "pointer",
                    }}
                  >
                    {withdrawingJobId === job._id ? "Withdrawing..." : "Withdraw Application"}
                  </button>
                </div>
              )}

              {myApplication && myApplication.status === "Interview Scheduled" && (
                <div
                  style={{
                    background: "#eaf7ea",
                    padding: "10px",
                    borderRadius: "6px",
                    marginTop: "10px",
                  }}
                >
                  <p><b>🎉 Interview Scheduled!</b></p>
                  <p>
                    <b>Date & Time:</b>{" "}
                    {new Date(myApplication.interviewDate).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p><b>Mode:</b> {myApplication.interviewMode}</p>
                  {myApplication.interviewNotes && (
                    <p><b>Notes:</b> {myApplication.interviewNotes}</p>
                  )}
                  <button
                    onClick={() => withdrawApplication(job._id)}
                    disabled={withdrawingJobId === job._id}
                    style={{
                      background: "#fff",
                      color: "#c62828",
                      border: "1px solid #c62828",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      cursor: withdrawingJobId === job._id ? "not-allowed" : "pointer",
                      marginTop: "8px",
                    }}
                  >
                    {withdrawingJobId === job._id ? "Withdrawing..." : "Withdraw Application"}
                  </button>
                </div>
              )}

              {myApplication &&
                myApplication.status !== "Applied" &&
                myApplication.status !== "Interview Scheduled" && (
                  <p><b>Status:</b> {myApplication.status}</p>
                )}
            </div>
          );
        })}

        {jobs.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "20px 0" }}>
            <button
              onClick={() => fetchJobs(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              ⬅ Prev
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => fetchJobs(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next ➡
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CandidateDashboard;
