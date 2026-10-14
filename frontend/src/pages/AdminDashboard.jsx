import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats/admin")
      .then((res) => setStats(res.data))
      .catch(() => setError("Could not load the admin dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error) return <div className="page-container"><div className="form-error">{error}</div></div>;

  const { totals, today } = stats;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Admin dashboard</h1>
        <p className="auth-subtitle">Platform-wide activity, {user.name}.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-number">{totals.users}</span>
          <span className="stat-label">Users</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totals.owners}</span>
          <span className="stat-label">Space owners</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totals.workspaces}</span>
          <span className="stat-label">Workspaces</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{totals.bookings}</span>
          <span className="stat-label">Bookings</span>
        </div>
      </div>

      {totals.pendingWorkspaces > 0 && (
        <div className="form-error" style={{ marginBottom: "24px" }}>
          {totals.pendingWorkspaces} workspace
          {totals.pendingWorkspaces === 1 ? "" : "s"} waiting for approval —{" "}
          <Link to="/admin/workspaces">review them</Link>.
        </div>
      )}

      <div className="dashboard-section">
        <h2>Today's activity</h2>
        <div className="stat-grid stat-grid-compact">
          <div className="stat-card">
            <span className="stat-number">{today.newUsers}</span>
            <span className="stat-label">New users</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{today.newWorkspaces}</span>
            <span className="stat-label">New workspaces</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{today.newBookings}</span>
            <span className="stat-label">New bookings</span>
          </div>
        </div>
      </div>

      <div className="dashboard-links">
        <Link to="/admin/workspaces" className="btn-primary-small">
          Review workspaces
        </Link>
        <Link to="/booking-requests" className="btn-link">
          All bookings
        </Link>
      </div>
    </div>
  );
}
