import { useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://smarthire-ai-kswb.onrender.com";

function ResetPassword() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "candidate";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async () => {
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordError("");
    setIsSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/users/reset-password/${token}`,
        { password, role }
      );
      showToast(res.data.message || "Password reset successfully ✅", "success");
      setTimeout(() => navigate(`/${role}`), 1200);
    } catch (err) {
      showToast(err.response?.data?.message || "Reset failed", "error");
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
        <h1>Reset Password</h1>

        <input
          type="password"
          placeholder="New Password (min 6 characters)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError("");
          }}
          style={{ borderColor: passwordError ? "#ef4444" : undefined }}
        />
        <br /><br />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (passwordError) setPasswordError("");
          }}
          style={{ borderColor: passwordError ? "#ef4444" : undefined }}
        />
        {passwordError && (
          <p style={{ color: "#ef4444", fontSize: "13px", textAlign: "left", marginTop: "6px" }}>
            {passwordError}
          </p>
        )}
        <br /><br />
        <button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
        <br /><br />
        <Link to={`/${role}`}>
          <button>Back to Login</button>
        </Link>
      </div>
    </div>
  );
}

export default ResetPassword;