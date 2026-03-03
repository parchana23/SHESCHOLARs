import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/platformStore";

function CompanyLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = login("organization", form.email, form.password);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("Organization login successful.");
    navigate("/dashboard");
  };

  return (
    <section className="page auth-page">
      <article className="auth-card">
        <h2>Organization / Company Login</h2>
        <p>Access opportunity posting, candidate ranking, document validation and lifecycle tracking.</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Organization Email"
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
        <p>New organization? <Link to="/company/register">Create organization account</Link></p>
      </article>
    </section>
  );
}

export default CompanyLogin;
