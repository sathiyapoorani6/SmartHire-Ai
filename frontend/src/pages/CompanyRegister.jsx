import { useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://smarthire-ai-kswb.onrender.com";

function CompanyRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // {message, type}
  const navigate = useNavigate();
  const toastTimerRef = useRef(null);
  const showToast = (message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };
  const registerCompany = async () => {
    // Validation - check password length before calling API
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    setPasswordError("");
    setIsSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/users/register`,
        {
          name,
          email,
          password,
          role: "company",
        }
      );
      showToast(res.data.message || "Registered successfully ✅", "success");
      setTimeout(() => navigate("/company"), 1200); // let the toast show before redirecting
    } catch (err) {
      showToast(err.response?.data?.message || "Registration Failed", "error");
      console.log(err);
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
        <h1>Company Registration</h1>
        <form onSubmit={(e) => { e.preventDefault(); registerCompany(); }}>
          <input
            type="text"
            placeholder="Enter Company Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <br /><br />
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <br /><br />
          <input
            type="password"
            placeholder="Enter Password (min 6 characters)"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError("");
            }}
            style={{
              borderColor: passwordError ? "#ef4444" : undefined,
            }}
          />
          {passwordError && (
            <p style={{ color: "#ef4444", fontSize: "13px", textAlign: "left", marginTop: "6px" }}>
              {passwordError}
            </p>
          )}
          <br /><br />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </button>
        </form>
        <br /><br />
        <Link to="/company">
          <button>Back to Login</button>
        </Link>
      </div>
    </div>
  );
}
export default CompanyRegister;
