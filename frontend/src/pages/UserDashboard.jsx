import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats/user")
      .then((res) => setStats(res.data))
      .catch(() => setError("Could not load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error) return <div className="page-container"><div className="form-error">{error}</div></div>;

  const { counts, upcoming } = stats;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {user.name}</h1>
        <p className="auth-subtitle">Here's a quick look at your bookings.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-number">{counts.total}</span>
          <span className="stat-label">Total bookings</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{counts.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{counts.approved}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{counts.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Upcoming booking</h2>
        {upcoming ? (
          <div className="workspace-card">
            <div className="workspace-card-main">
              <h3>{upcoming.workspaceId?.name || "Workspace"}</h3>
              <p className="muted">{upcoming.workspaceId?.location}</p>
              <p>
                {upcoming.date} · {upcoming.startTime}–{upcoming.endTime} ·{" "}
                {upcoming.numberOfPeople} people
              </p>
            </div>
            <div className="workspace-card-meta">
              <span className="status-badge status-approved">Approved</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>No upcoming approved bookings.</p>
            <p className="muted">
              <Link to="/">Browse workspaces</Link> to make a request.
            </p>
          </div>
        )}
      </div>

      <div className="dashboard-links">
        <Link to="/my-bookings" className="btn-primary-small">
          View all bookings
        </Link>
        <Link to="/" className="btn-link">
          Explore workspaces
        </Link>
      </div>
    </div>
  );
}
