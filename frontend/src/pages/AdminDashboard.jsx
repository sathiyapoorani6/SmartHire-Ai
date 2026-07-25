import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isTokenExpired } from "../utils/auth";

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalCandidates: 0,
    totalApplications: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsTotalPages, setJobsTotalPages] = useState(1);

  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesTotalPages, setCandidatesTotalPages] = useState(1);

  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [toast, setToast] = useState(null); // {message, type}

  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Logs the user out and sends them back to login, with an optional reason message
  const forceLogout = (reason) => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    if (reason) showToast(reason, "error");
    navigate("/admin");
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/admin");
      return;
    }

    if (isTokenExpired(token)) {
      forceLogout("Session expired. Please login again.");
      return;
    }

    setUser(JSON.parse(storedUser));

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

  const fetchPendingCompanies = () => {
    setPendingLoading(true);
    const token = localStorage.getItem("token");
    fetch("http://localhost:5000/api/admin/pending-companies", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPendingCompanies(data.companies);
        }
        setPendingLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setPendingLoading(false);
      });
  };

  const fetchJobs = (page = 1) => {
    const token = localStorage.getItem("token");
    setJobsLoading(true);
    fetch(`http://localhost:5000/api/admin/jobs?page=${page}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setJobs(data.jobs);
          setJobsTotalPages(data.totalPages || 1);
          setJobsPage(data.currentPage || 1);
        }
        setJobsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setJobsLoading(false);
      });
  };

  const fetchCandidates = (page = 1) => {
    const token = localStorage.getItem("token");
    setCandidatesLoading(true);
    fetch(`http://localhost:5000/api/admin/candidates?page=${page}&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCandidates(data.candidates);
          setCandidatesTotalPages(data.totalPages || 1);
          setCandidatesPage(data.currentPage || 1);
        }
        setCandidatesLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setCandidatesLoading(false);
      });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:5000/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data);
        }
        setStatsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setStatsLoading(false);
      });

    fetchJobs();
    fetchCandidates();
    fetchPendingCompanies();
  }, []);
  const approveCompany = async (companyId) => {
    const token = localStorage.getItem("token");
    setApprovingId(companyId);
    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/approve-company/${companyId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      if (res.status === 401) {
        forceLogout(data.message || "Session expired. Please login again.");
        return;
      }

      if (data.success) {
        showToast(data.message || "Company approved ✅", "success");
        fetchPendingCompanies(); // refresh the list so the approved one disappears
      } else {
        showToast(data.message || "Approval failed", "error");
      }
    } catch (err) {
      showToast("Approval failed", "error");
      console.log(err);
    } finally {
      setApprovingId(null);
    }
  };

  const handleLogout = () => {
    forceLogout(null);
  };
const viewResume = async (userId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/api/users/resume/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        showToast("Unable to load resume", "error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank"); // opens in a new tab
    } catch (err) {
      showToast("Unable to load resume", "error");
      console.log(err);
    }
  };
  const thStyle = {
    textAlign: "left",
    padding: "10px",
    borderBottom: "2px solid #ccc",
    background: "#f0f0f0",
  };

  const tdStyle = {
    padding: "10px",
    borderBottom: "1px solid #eee",
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
        <h1>Welcome, {user.name} 🛡️</h1>
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>

        <br />

        <h2>Reports & Analytics</h2>

        {statsLoading ? (
          <p>Loading stats...</p>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "20px",
              margin: "20px 0",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                padding: "20px",
                background: "#f0f0f0",
                borderRadius: "10px",
                minWidth: "150px",
                textAlign: "center",
              }}
            >
              <h3>Total Jobs</h3>
              <p style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
                {stats.totalJobs}
              </p>
            </div>

            <div
              style={{
                padding: "20px",
                background: "#f0f0f0",
                borderRadius: "10px",
                minWidth: "150px",
                textAlign: "center",
              }}
            >
              <h3>Total Candidates</h3>
              <p style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
                {stats.totalCandidates}
              </p>
            </div>

            <div
              style={{
                padding: "20px",
                background: "#f0f0f0",
                borderRadius: "10px",
                minWidth: "150px",
                textAlign: "center",
              }}
            >
              <h3>Total Applications</h3>
              <p style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>
                {stats.totalApplications}
              </p>
            </div>
          </div>
        )}

        <hr style={{ margin: "30px 0" }} />

        <h2>Pending Company Approvals</h2>

        {pendingLoading ? (
          <p>Loading pending companies...</p>
        ) : pendingCompanies.length === 0 ? (
          <p>No companies waiting for approval 🎉</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Company Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingCompanies.map((company) => (
                  <tr key={company._id}>
                    <td style={tdStyle}>{company.name}</td>
                    <td style={tdStyle}>{company.email}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => approveCompany(company._id)}
                        disabled={approvingId === company._id}
                      >
                        {approvingId === company._id ? "Approving..." : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <hr style={{ margin: "30px 0" }} />

        <h2>All Jobs</h2>

        {jobsLoading ? (
          <p>Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p>No jobs posted yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Salary</th>
                  <th style={thStyle}>Posted By</th>
                  <th style={thStyle}>Applicants</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job._id}>
                    <td style={tdStyle}>{job.title}</td>
                    <td style={tdStyle}>{job.company}</td>
                    <td style={tdStyle}>{job.location}</td>
                    <td style={tdStyle}>{job.salary || "-"}</td>
                    <td style={tdStyle}>{job.postedByName}</td>
                    <td style={tdStyle}>{job.applicantCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "15px 0" }}>
              <button onClick={() => fetchJobs(jobsPage - 1)} disabled={jobsPage <= 1}>
                ⬅ Prev
              </button>
              <span>Page {jobsPage} of {jobsTotalPages}</span>
              <button onClick={() => fetchJobs(jobsPage + 1)} disabled={jobsPage >= jobsTotalPages}>
                Next ➡
              </button>
            </div>
          </div>
        )}

        <hr style={{ margin: "30px 0" }} />

        <h2>All Candidates</h2>

        {candidatesLoading ? (
          <p>Loading candidates...</p>
        ) : candidates.length === 0 ? (
          <p>No candidates registered yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Resume</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c._id}>
                    <td style={tdStyle}>{c.name}</td>
                    <td style={tdStyle}>{c.email}</td>
                    <td style={tdStyle}>
                      {c.resume ? (
                        <button onClick={() => viewResume(c._id)}>
                          View Resume
                        </button>
                      ) : (
                        <i>Not uploaded</i>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "15px 0" }}>
              <button onClick={() => fetchCandidates(candidatesPage - 1)} disabled={candidatesPage <= 1}>
                ⬅ Prev
              </button>
              <span>Page {candidatesPage} of {candidatesTotalPages}</span>
              <button onClick={() => fetchCandidates(candidatesPage + 1)} disabled={candidatesPage >= candidatesTotalPages}>
                Next ➡
              </button>
            </div>
          </div>
        )}

        <br />
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  );
}

export default AdminDashboard;