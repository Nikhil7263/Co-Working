import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats/owner")
      .then((res) => setStats(res.data))
      .catch(() => setError("Could not load your dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error) return <div className="page-container"><div className="form-error">{error}</div></div>;

  const { workspaceCounts, occupancy, bookingCounts, todaysBookings } = stats;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome, {user.name}</h1>
        <p className="auth-subtitle">
          A summary of your workspaces and bookings.
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-number">{workspaceCounts.total}</span>
          <span className="stat-label">Total workspaces</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{workspaceCounts.pending}</span>
          <span className="stat-label">Pending approval</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{bookingCounts.total}</span>
          <span className="stat-label">Total bookings</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{todaysBookings}</span>
          <span className="stat-label">Today's bookings</span>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Live occupancy</h2>
        <div className="occupancy-panel" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
          <div className="occupancy-bar-track">
            <div
              className="occupancy-bar-fill"
              style={{ width: `${occupancy.occupancyRate}%` }}
            />
          </div>
          <p className="occupancy-numbers">
            {occupancy.totalOccupied} / {occupancy.totalCapacity} seats occupied
            across all approved workspaces ({occupancy.occupancyRate}%)
          </p>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Booking requests</h2>
        <div className="stat-grid stat-grid-compact">
          <div className="stat-card">
            <span className="stat-number">{bookingCounts.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{bookingCounts.approved}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{bookingCounts.rejected}</span>
            <span className="stat-label">Rejected</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{bookingCounts.cancelled}</span>
            <span className="stat-label">Cancelled</span>
          </div>
        </div>
      </div>

      <div className="dashboard-links">
        <Link to="/my-workspaces" className="btn-primary-small">
          My workspaces
        </Link>
        <Link to="/booking-requests" className="btn-link">
          Booking requests
        </Link>
        <Link to="/live-monitor" className="btn-link">
          Live monitor
        </Link>
        <Link to="/add-workspace" className="btn-link">
          Add workspace
        </Link>
      </div>
    </div>
  );
}
