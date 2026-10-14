import { useEffect, useState } from "react";
import api from "../services/api";

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AdminWorkspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("pending");

  const load = () => {
    setLoading(true);
    api
      .get("/workspaces/admin/all", { params: filter ? { status: filter } : {} })
      .then((res) => setWorkspaces(res.data.workspaces))
      .catch(() => setError("Could not load workspaces."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleStatusChange = async (id, status) => {
    setActionError("");
    try {
      await api.put(`/workspaces/${id}`, { status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || `Could not update status.`);
    }
  };

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
        <h1>Admin — workspace approvals</h1>
        <p className="auth-subtitle">
          Review listings submitted by space owners before they go public.
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

      {!loading && !error && workspaces.length === 0 && (
        <div className="empty-state">
          <p>No {filter || ""} workspaces.</p>
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
              <p className="muted">
                {ws.location} · listed by {ws.ownerId?.name || "unknown"} (
                {ws.ownerId?.email || "no email"})
              </p>
              <p>
                {ws.capacity} people · {ws.area} sq.ft · {ws.workspaceType.replace("_", " ")} · ₹
                {ws.price}/day
              </p>
              {ws.amenities?.length > 0 && (
                <div className="amenity-tags">
                  {ws.amenities.map((a) => (
                    <span key={a} className="tag">
                      {a.replace("_", " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="workspace-card-meta">
              {ws.status === "pending" && (
                <div className="approve-reject-row">
                  <button
                    className="btn-approve"
                    onClick={() => handleStatusChange(ws._id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleStatusChange(ws._id, "rejected")}
                  >
                    Reject
                  </button>
                </div>
              )}
              {ws.status === "approved" && (
                <button
                  className="btn-reject"
                  onClick={() => handleStatusChange(ws._id, "rejected")}
                >
                  Revoke approval
                </button>
              )}
              {ws.status === "rejected" && (
                <button
                  className="btn-approve"
                  onClick={() => handleStatusChange(ws._id, "approved")}
                >
                  Approve anyway
                </button>
              )}
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
