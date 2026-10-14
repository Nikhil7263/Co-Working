import { useEffect, useState } from "react";
import api from "../services/api";

const STATUS_LABELS = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/bookings/mine")
      .then((res) => setBookings(res.data.bookings))
      .catch(() => setError("Could not load your bookings."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCancel = async (bookingId) => {
    setActionError("");
    try {
      await api.patch(`/bookings/${bookingId}/cancel`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not cancel booking.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My bookings</h1>
        <p className="auth-subtitle">Track the status of your booking requests.</p>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <div className="form-error">{error}</div>}
      {actionError && <div className="form-error">{actionError}</div>}

      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">
          <p>No bookings yet.</p>
          <p className="muted">Browse workspaces and request a booking to see it here.</p>
        </div>
      )}

      <div className="workspace-list">
        {bookings.map((b) => (
          <div className="workspace-card" key={b._id}>
            <div className="workspace-card-main">
              <h3>{b.workspaceId?.name || "Workspace"}</h3>
              <p className="muted">{b.workspaceId?.location}</p>
              <p>
                {b.date} · {b.startTime}–{b.endTime} · {b.numberOfPeople} people
              </p>
              {b.notes && <p className="muted">{b.notes}</p>}
            </div>
            <div className="workspace-card-meta">
              <span className={`status-badge status-${b.status}`}>
                {STATUS_LABELS[b.status] || b.status}
              </span>
              {["pending", "approved"].includes(b.status) && (
                <button
                  className="btn-link"
                  onClick={() => handleCancel(b._id)}
                  style={{ marginTop: "8px" }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
