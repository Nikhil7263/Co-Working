import { useEffect, useState } from "react";
import api from "../services/api";
import useWorkspaceOccupancy from "../hooks/useWorkspaceOccupancy";

function MonitorCard({ workspace, onOccupancyChanged }) {
  const occupancy = useWorkspaceOccupancy(workspace._id, {
    occupied: workspace.occupied,
    capacity: workspace.capacity,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const changeOccupancy = async (delta) => {
    if (!occupancy) return;
    const next = occupancy.occupied + delta;
    if (next < 0 || next > occupancy.capacity) return;

    setBusy(true);
    setError("");
    try {
      await api.patch(`/workspaces/${workspace._id}/occupancy`, { occupied: next });
      onOccupancyChanged?.();
      // No need to manually update local state — the Socket.IO broadcast
      // the backend sends will update `occupancy` for every viewer,
      // including this one, within milliseconds.
    } catch (err) {
      setError(err.response?.data?.message || "Could not update occupancy.");
    } finally {
      setBusy(false);
    }
  };

  if (!occupancy) return null;

  const percent = Math.min((occupancy.occupied / occupancy.capacity) * 100, 100);

  return (
    <div className="workspace-card monitor-card">
      <div className="workspace-card-main">
        <div className="workspace-title-row">
          <h3>{workspace.name}</h3>
          <span className="live-dot" title="Live" />
        </div>
        <p className="muted">{workspace.location}</p>

        <div className="occupancy-bar-track">
          <div className="occupancy-bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="occupancy-numbers">
          {occupancy.occupied} / {occupancy.capacity} occupied ·{" "}
          {occupancy.capacity - occupancy.occupied} available
        </p>

        {error && <p className="form-error" style={{ marginTop: "10px" }}>{error}</p>}
      </div>

      <div className="workspace-card-meta monitor-controls">
        <span className="meta-label">Simulate check-in / check-out</span>
        <div className="occupancy-controls">
          <button
            type="button"
            className="btn-step"
            onClick={() => changeOccupancy(-1)}
            disabled={busy || occupancy.occupied <= 0}
          >
            − Check out
          </button>
          <button
            type="button"
            className="btn-step"
            onClick={() => changeOccupancy(1)}
            disabled={busy || occupancy.occupied >= occupancy.capacity}
          >
            + Check in
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LiveMonitor() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/workspaces/mine/list")
      .then((res) =>
        setWorkspaces(res.data.workspaces.filter((w) => w.status === "approved"))
      )
      .catch(() => setError("Could not load your workspaces."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Live occupancy monitor</h1>
        <p className="auth-subtitle">
          Track how full your approved workspaces are, in real time. Updates
          here appear instantly on the public listing page too.
        </p>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && workspaces.length === 0 && (
        <div className="empty-state">
          <p>No approved workspaces to monitor yet.</p>
          <p className="muted">
            Once an admin approves one of your listings, it'll show up here.
          </p>
        </div>
      )}

      <div className="workspace-list">
        {workspaces.map((ws) => (
          <MonitorCard key={ws._id} workspace={ws} onOccupancyChanged={load} />
        ))}
      </div>
    </div>
  );
}
