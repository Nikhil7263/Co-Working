import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const AMENITY_OPTIONS = [
  "wifi",
  "parking",
  "meeting_room",
  "power_backup",
  "cafeteria",
  "security",
];

export default function AddWorkspace() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    area: "",
    capacity: "",
    workspaceType: "shared_desk",
    price: "",
  });
  const [amenities, setAmenities] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleAmenity = (amenity) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/workspaces", {
        ...form,
        area: Number(form.area),
        capacity: Number(form.capacity),
        price: Number(form.price),
        amenities,
      });
      setSuccess(
        "Workspace submitted. It will appear publicly once an admin approves it."
      );
      setTimeout(() => navigate("/my-workspaces"), 1800);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not create workspace. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <h1>List a workspace</h1>
        <p className="auth-subtitle">
          Submissions are reviewed by an admin before going live.
        </p>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span>Workspace name</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="TechHub Coworking"
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="A quiet, well-lit space with fast internet and a good coffee machine."
            />
          </label>

          <label className="field">
            <span>Location</span>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              required
              placeholder="Bhubaneswar"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Area (sq. ft)</span>
              <input
                type="number"
                name="area"
                value={form.area}
                onChange={handleChange}
                required
                min={1}
              />
            </label>

            <label className="field">
              <span>Capacity (people)</span>
              <input
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                required
                min={1}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Workspace type</span>
              <select
                name="workspaceType"
                value={form.workspaceType}
                onChange={handleChange}
              >
                <option value="shared_desk">Shared desk</option>
                <option value="private_cabin">Private cabin</option>
                <option value="meeting_room">Meeting room</option>
              </select>
            </label>

            <label className="field">
              <span>Price (per day)</span>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                min={0}
              />
            </label>
          </div>

          <fieldset className="field">
            <legend>Amenities</legend>
            <div className="amenity-grid">
              {AMENITY_OPTIONS.map((amenity) => (
                <label key={amenity} className="amenity-checkbox">
                  <input
                    type="checkbox"
                    checked={amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                  />
                  <span>{amenity.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
