import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://smarthire-ai-kswb.onrender.com";

function CandidateLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // {message, type}
  const navigate = useNavigate();
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const loginUser = async () => {
    setIsSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/users/login`,
        {
          email,
          password,
          role: "candidate",
        }
      );
      if (res.data.success) {
        showToast(res.data.message || "Login successful ✅", "success");
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("token", res.data.token); // 👈 store JWT for later requests
        setTimeout(() => navigate("/candidate-dashboard"), 600);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Login Failed", "error");
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
        <h1>Candidate Login</h1>
        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br /><br />
        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br /><br />
        <button onClick={loginUser} disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
        <br /><br />
        <Link to="/forgot-password?role=candidate">
          <button>Forgot Password?</button>
        </Link>
        <br /><br />
        <Link to="/candidate-register">
          <button>New user? Register here</button>
        </Link>
      </div>
    </div>
  );
}
export default CandidateLogin;
