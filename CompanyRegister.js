import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/platformStore";

function CompanyRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    registrationNumber: "",
    sector: "",
    opportunityCategory: "",
    requiredSkills: "",
    eligibilityCriteria: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    const result = registerUser("organization", {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      profile: {
        registrationNumber: form.registrationNumber,
        sector: form.sector,
        opportunityCategory: form.opportunityCategory,
        requiredSkills: form.requiredSkills.split(",").map((value) => value.trim()).filter(Boolean),
        eligibilityCriteria: form.eligibilityCriteria,
      },
    });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <section className="page auth-page">
      <article className="auth-card wide">
        <h2>Organization Registration</h2>
        <p>Register your organization, add eligibility requirements and publish opportunities.</p>
        <form className="form-grid two-col" onSubmit={handleSubmit}>
          <input placeholder="Organization Name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input type="email" placeholder="Official Email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input type="password" placeholder="Password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <input placeholder="Contact Number" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <input placeholder="Registration Number" required value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} />
          <input placeholder="Sector" required value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })} />
          <input placeholder="Opportunity Category" required value={form.opportunityCategory} onChange={(event) => setForm({ ...form, opportunityCategory: event.target.value })} />
          <input placeholder="Required Skills (comma separated)" value={form.requiredSkills} onChange={(event) => setForm({ ...form, requiredSkills: event.target.value })} />
          <textarea placeholder="Eligibility Criteria" value={form.eligibilityCriteria} onChange={(event) => setForm({ ...form, eligibilityCriteria: event.target.value })} />
          <button type="submit" className="btn primary-btn">Create Organization Account</button>
        </form>
        {message && <p className="status-text">{message}</p>}
        <p>Already registered? <Link to="/company/login">Login</Link></p>
      </article>
    </section>
  );
}

export default CompanyRegister;
