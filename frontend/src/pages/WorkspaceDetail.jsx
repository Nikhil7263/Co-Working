import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import useWorkspaceOccupancy from "../hooks/useWorkspaceOccupancy";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [form, setForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    numberOfPeople: 1,
    notes: "",
  });
  const [availability, setAvailability] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get(`/workspaces/${id}`)
      .then((res) => setWorkspace(res.data.workspace))
      .catch(() => setLoadError("Could not load this workspace."))
      .finally(() => setLoading(false));
  }, [id]);

  const occupancy = useWorkspaceOccupancy(
    id,
    workspace ? { occupied: workspace.occupied, capacity: workspace.capacity } : null
  );

  const checkAvailability = async (date) => {
    if (!date) {
      setAvailability(null);
      return;
    }
    try {
      const res = await api.get("/bookings/availability", {
        params: { workspaceId: id, date },
      });
      setAvailability(res.data);
    } catch {
      setAvailability(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === "date") {
      checkAvailability(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingSuccess("");

    if (!user) {
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/bookings", {
        workspaceId: id,
        ...form,
        numberOfPeople: Number(form.numberOfPeople),
      });
      setBookingSuccess(
        "Booking request sent. The owner will approve or reject it — check My Bookings for updates."
      );
      setForm({ date: "", startTime: "", endTime: "", numberOfPeople: 1, notes: "" });
      setAvailability(null);
    } catch (err) {
      setBookingError(
        err.response?.data?.message || "Could not send booking request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (loadError) return <div className="page-container"><div className="form-error">{loadError}</div></div>;
  if (!workspace) return null;

  return (
    <div className="page-container detail-layout">
      <div className="detail-main">
        <h1>{workspace.name}</h1>
        <p className="muted">{workspace.location}</p>
        {workspace.description && <p>{workspace.description}</p>}

        <div className="detail-facts">
          <div>
            <span className="meta-label">Type</span>
            <span>{workspace.workspaceType.replace("_", " ")}</span>
          </div>
          <div>
            <span className="meta-label">Capacity</span>
            <span>{workspace.capacity} people</span>
          </div>
          <div>
            <span className="meta-label">Area</span>
            <span>{workspace.area} sq.ft</span>
          </div>
          <div className="price">₹{workspace.price}/day</div>
        </div>

        {workspace.amenities?.length > 0 && (
          <div className="amenity-tags">
            {workspace.amenities.map((a) => (
              <span key={a} className="tag">
                {a.replace("_", " ")}
              </span>
            ))}
          </div>
        )}

        {occupancy && (
          <div className="occupancy-panel">
            <div className="occupancy-header">
              <h3>Live occupancy</h3>
              <span className="live-dot" title="Updates in real time" />
            </div>
            <div className="occupancy-bar-track">
              <div
                className="occupancy-bar-fill"
                style={{
                  width: `${Math.min(
                    (occupancy.occupied / occupancy.capacity) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <p className="occupancy-numbers">
              {occupancy.occupied} / {occupancy.capacity} seats occupied ·{" "}
              {occupancy.capacity - occupancy.occupied} available right now
            </p>
          </div>
        )}
      </div>

      <div className="detail-booking form-card">
        <h2>Request a booking</h2>

        {bookingError && <div className="form-error">{bookingError}</div>}
        {bookingSuccess && <div className="form-success">{bookingSuccess}</div>}

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </label>

          {availability && (
            <p className="muted availability-note">
              {availability.remainingCapacity} of {availability.capacity} seats
              free on this date
            </p>
          )}

          <div className="field-row">
            <label className="field">
              <span>Start time</span>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                required
              />
            </label>
            <label className="field">
              <span>End time</span>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Number of people</span>
            <input
              type="number"
              name="numberOfPeople"
              value={form.numberOfPeople}
              onChange={handleChange}
              min={1}
              max={workspace.capacity}
              required
            />
          </label>

          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
            />
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Sending request..." : "Request booking"}
          </button>

          {!user && (
            <p className="muted" style={{ fontSize: "13px" }}>
              You'll be asked to log in when you submit.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
