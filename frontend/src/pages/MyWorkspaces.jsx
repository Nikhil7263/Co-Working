import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const STATUS_LABELS = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

export default function MyWorkspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/workspaces/mine/list")
      .then((res) => setWorkspaces(res.data.workspaces))
      .catch(() => setError("Could not load your workspaces."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setActionError("");
    try {
      await api.delete(`/workspaces/${id}`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not delete workspace.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My workspaces</h1>
        <p className="auth-subtitle">
          Everything you've submitted, including listings still waiting on
          admin approval.
        </p>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <div className="form-error">{error}</div>}
      {actionError && <div className="form-error">{actionError}</div>}

      {!loading && !error && workspaces.length === 0 && (
        <div className="empty-state">
          <p>You haven't listed any workspaces yet.</p>
          <p className="muted">
            <Link to="/add-workspace">Add your first workspace</Link>
          </p>
        </div>
      )}

      <div className="workspace-list">
        {workspaces.map((ws) => (
          <div className="workspace-card" key={ws._id}>
            <div className="workspace-card-main">
              <div className="workspace-title-row">
                <h3>{ws.name}</h3>
                <span className={`status-badge status-${ws.status}`}>
                  {STATUS_LABELS[ws.status] || ws.status}
                </span>
              </div>
              <p className="muted">{ws.location}</p>
              <p>
                {ws.capacity} people · {ws.area} sq.ft · ₹{ws.price}/day
              </p>
              {ws.status === "pending" && (
                <p className="muted" style={{ fontSize: "13px" }}>
                  Waiting for an admin to review this listing. It won't
                  appear on the public Explore page until approved.
                </p>
              )}
              {ws.status === "rejected" && (
                <p className="muted" style={{ fontSize: "13px", color: "var(--color-error)" }}>
                  This listing was rejected by an admin.
                </p>
              )}
            </div>
            <div className="workspace-card-meta">
              <div>
                <span className="meta-label">Occupied</span>
                <span>
                  {ws.occupied} / {ws.capacity}
                </span>
              </div>
              <button
                className="btn-link"
                onClick={() => handleDelete(ws._id, ws.name)}
                style={{ marginTop: "8px" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
