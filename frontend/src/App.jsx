import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Splash from "./pages/Splash";
import Home from "./pages/Home";
import AdminLogin from "./pages/AdminLogin";
import CompanyLogin from "./pages/CompanyLogin";
import CompanyRegister from "./pages/CompanyRegister";
import CandidateLogin from "./pages/CandidateLogin";
import CandidateRegister from "./pages/CandidateRegister";
import AdminDashboard from "./pages/AdminDashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import CandidateDashboard from "./pages/CandidateDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      navigate("/", { replace: true });
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showSplash) {
    return <Splash />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/company" element={<CompanyLogin />} />
      <Route path="/company-register" element={<CompanyRegister />} />
      <Route path="/candidate" element={<CandidateLogin />} />
      <Route path="/candidate-register" element={<CandidateRegister />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/company-dashboard" element={<CompanyDashboard />} />
      <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
    </Routes>
  );
}

export default App;
