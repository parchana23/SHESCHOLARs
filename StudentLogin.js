import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/platformStore";

function StudentLogin() {
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = login("student", form.email, form.password);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("Login successful.");
    navigate("/dashboard");
  };

  return (
    <section className="page auth-page">
      <article className="auth-card">
        <h2>Student Login</h2>
        <p>Sign in to access scholarships, AI matching, document vault, and tracking timeline.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <button className="btn primary-btn" type="submit">Login</button>
        </form>
        {message && <p className="status-text">{message}</p>}
        <p>New user? <Link to="/student/register">Create student account</Link></p>
      </article>
    </section>
  );
}

export default StudentLogin;
