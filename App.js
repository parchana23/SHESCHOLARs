import { BrowserRouter, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home";
import StudentRegister from "./pages/StudentRegister";
import CompanyRegister from "./pages/CompanyRegister";
import StudentLogin from "./pages/StudentLogin";
import CompanyLogin from "./pages/CompanyLogin";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import { getSession, getSessionEventName, logoutSession } from "./services/platformStore";
import "./App.css";

function AppNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(getSession());

  useEffect(() => {
    const syncSession = () => setSession(getSession());
    const eventName = getSessionEventName();
    window.addEventListener(eventName, syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener(eventName, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  useEffect(() => {
    setSession(getSession());
  }, [location.pathname]);

  const handleLogout = () => {
    logoutSession();
    setSession(null);
    navigate("/");
  };

  return (
    <header className="top-nav">
      <div className="nav-brand">
        <span className="brand-dot" />
        <div>
          <p className="brand-title">SheScholar</p>
          <p className="brand-subtitle">Women Education and Career Empowerment</p>
        </div>
      </div>

      <nav className="nav-links">
        <NavLink to="/">Home</NavLink>
        {session?.role === "student" && <NavLink to="/dashboard">Student Dashboard</NavLink>}
        {session?.role === "organization" && <NavLink to="/dashboard">Organization Dashboard</NavLink>}
        {session && <NavLink to="/analytics">Analytics</NavLink>}
      </nav>

      <div className="nav-actions">
        {!session && <NavLink className="btn ghost-btn" to="/student/login">Student Login</NavLink>}
        {!session && <NavLink className="btn ghost-btn" to="/company/login">Organization Login</NavLink>}
        {session && (
          <button className="btn danger-btn" onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppNav />
      <main className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/register" element={<StudentRegister />} />
          <Route path="/company/login" element={<CompanyLogin />} />
          <Route path="/company/register" element={<CompanyRegister />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
