import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
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

  useEffect(() => {
    // 👇 Just hide the splash after a beat — do NOT navigate away from
    // whatever URL the browser is actually on. Force-navigating to "/" here
    // used to hijack every page refresh and every deep link (e.g. a
    // password-reset email link) back to the Home page.
    const timer = setTimeout(() => setShowSplash(false), 1000);
    return () => clearTimeout(timer);
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
