import { Link } from "react-router-dom";
import { getSession } from "../services/platformStore";
import { firebaseStatusText } from "../services/firebase";

const roleCards = [
  {
    title: "Login as Student",
    subtitle: "Find My Scholarship",
    action: "/student/login",
  },
  {
    title: "Login as Company",
    subtitle: "Invest in Talent",
    action: "/company/login",
  },
];

function Home() {
  const session = getSession();

  return (
    <section className="page home-page">
      <article className="mono-hero">
        <p className="eyebrow">SheScholar</p>
        <h1>Intelligent Scholarship and Opportunity Platform for Women Empowerment</h1>
        <p>
          Skill-based recommendations, eligibility prediction, secure document trust flow, and transparent
          application lifecycle for students and organizations.
        </p>
      </article>

      {!session && (
        <section className="role-split">
          {roleCards.map((role) => (
            <article className="role-tile" key={role.title}>
              <h3>{role.title}</h3>
              <Link to={role.action} className="btn primary-btn">{role.subtitle}</Link>
            </article>
          ))}
        </section>
      )}

      {session && (
        <article className="panel-card">
          <h3>Welcome back, {session.name}</h3>
          <Link to="/dashboard" className="btn primary-btn">Open Dashboard</Link>
        </article>
      )}

      <div className="kpi-grid">
        <div className="kpi-card">
          <h3>AI Eligibility</h3>
          <p>Logistic Regression scoring with clear match bands.</p>
        </div>
        <div className="kpi-card">
          <h3>Document Trust</h3>
          <p>Students and companies can view and verify submitted documents per application.</p>
        </div>
        <div className="kpi-card">
          <h3>Bidirectional Matching</h3>
          <p>Opportunity-to-student and student-to-opportunity intelligent matching.</p>
        </div>
        <div className="kpi-card">
          <h3>Platform Status</h3>
          <p>{firebaseStatusText()}</p>
        </div>
      </div>
    </section>
  );
}

export default Home;
