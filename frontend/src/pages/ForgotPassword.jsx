import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://smarthire-ai-kswb.onrender.com";

function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get("role") || "candidate";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roleFromUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async () => {
    if (!email) {
      showToast("Please enter your email", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/users/forgot-password`, {
        email,
        role,
      });
      showToast(res.data.message || "Reset link sent ✅", "success");
      setSubmitted(true);
    } catch (err) {
      showToast(err.response?.data?.message || "Something went wrong", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1>Forgot Password</h1>

        {submitted ? (
          <p style={{ margin: "16px 0" }}>
            If an account exists for <strong>{email}</strong>, we've sent a password
            reset link. Please check your inbox (and spam folder).
          </p>
        ) : (
          <>
            <p style={{ margin: "8px 0 16px", fontSize: "14px", color: "#555" }}>
              Enter your account email and we'll send you a link to reset your password.
            </p>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ marginBottom: "12px", width: "100%", padding: "8px" }}
            >
              <option value="candidate">Candidate</option>
              <option value="company">Company</option>
              <option value="admin">Admin</option>
            </select>

            <input
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <br /><br />
            <button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        )}

        <br /><br />
        <Link to={`/${role === "candidate" ? "candidate" : role}`}>
          <button>Back to Login</button>
        </Link>
      </div>
    </div>
  );
}

export default ForgotPassword;