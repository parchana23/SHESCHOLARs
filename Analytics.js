import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { getState } from "../services/platformStore";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Analytics() {
  const state = useMemo(() => getState(), []);

  const successByType = state.opportunities.reduce((acc, opp) => {
    if (!acc[opp.type]) acc[opp.type] = { total: 0, approved: 0 };
    acc[opp.type].total += 1;
    const related = state.applications.filter((app) => app.opportunityId === opp.id);
    acc[opp.type].approved += related.filter((app) => app.status === "Approved").length;
    return acc;
  }, {});

  const skillDemand = state.opportunities.reduce((acc, opp) => {
    (opp.requiredSkills || []).forEach((skill) => {
      acc[skill] = (acc[skill] || 0) + 1;
    });
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(successByType),
    datasets: [
      {
        label: "Opportunities",
        data: Object.values(successByType).map((item) => item.total),
        backgroundColor: "#0ea5e9",
      },
      {
        label: "Approved Applications",
        data: Object.values(successByType).map((item) => item.approved),
        backgroundColor: "#22c55e",
      },
    ],
  };

  return (
    <section className="page dashboard-page">
      <article className="panel-card">
        <h2>Platform Analytics</h2>
        <p>Match success rates, completion trends, and skill demand signals.</p>
      </article>

      <div className="dashboard-grid">
        <article className="panel-card">
          <h3>Opportunity Engagement</h3>
          <Bar data={chartData} />
        </article>

        <article className="panel-card">
          <h3>Core KPIs</h3>
          <p>Active users: <strong>{state.users.length}</strong></p>
          <p>Applications count: <strong>{state.applications.length}</strong></p>
          <p>Verification statistics: <strong>{state.users.flatMap((user) => user.documents).filter((doc) => doc.status === "verified").length}</strong> docs verified</p>
          <p>Platform engagement: <strong>{state.notifications.length}</strong> notifications generated</p>
        </article>

        <article className="panel-card">
          <h3>Skill Demand Trends</h3>
          {Object.entries(skillDemand).map(([skill, count]) => (
            <p key={skill}>{skill}: {count} opportunities</p>
          ))}
        </article>
      </div>
    </section>
  );
}

export default Analytics;
