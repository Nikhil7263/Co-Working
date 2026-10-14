import { useEffect, useState } from "react";
import api from "../services/api";

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

export default function BookingRequests() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("pending");

  const load = () => {
    setLoading(true);
    api
      .get("/bookings/owner", { params: filter ? { status: filter } : {} })
      .then((res) => setBookings(res.data.bookings))
      .catch(() => setError("Could not load booking requests."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleDecision = async (bookingId, action) => {
    setActionError("");
    try {
      await api.patch(`/bookings/${bookingId}/${action}`);
      load();
    } catch (err) {
      setActionError(
        err.response?.data?.message || `Could not ${action} this booking.`
      );
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Booking requests</h1>
        <p className="auth-subtitle">
          Approve or reject booking requests for your workspaces.
        </p>
      </div>

      <div className="filter-tabs">
        {["pending", "approved", "rejected", ""].map((s) => (
          <button
            key={s || "all"}
            className={`filter-tab ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s ? STATUS_LABELS[s] : "All"}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <div className="form-error">{error}</div>}
      {actionError && <div className="form-error">{actionError}</div>}

      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">
          <p>No {filter || ""} booking requests.</p>
        </div>
      )}

      <div className="workspace-list">
        {bookings.map((b) => (
          <div className="workspace-card" key={b._id}>
            <div className="workspace-card-main">
              <h3>{b.workspaceId?.name || "Workspace"}</h3>
              <p className="muted">
                Requested by {b.userId?.name} ({b.userId?.email})
              </p>
              <p>
                {b.date} · {b.startTime}–{b.endTime} · {b.numberOfPeople} people
              </p>
              {b.notes && <p className="muted">"{b.notes}"</p>}
            </div>
            <div className="workspace-card-meta">
              <span className={`status-badge status-${b.status}`}>
                {STATUS_LABELS[b.status] || b.status}
              </span>
              {b.status === "pending" && (
                <div className="approve-reject-row">
                  <button
                    className="btn-approve"
                    onClick={() => handleDecision(b._id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleDecision(b._id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
