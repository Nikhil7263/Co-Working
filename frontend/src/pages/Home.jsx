import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const AMENITY_OPTIONS = [
  "wifi",
  "parking",
  "meeting_room",
  "power_backup",
  "cafeteria",
  "security",
];

const emptyFilters = {
  location: "",
  numberOfPeople: "",
  area: "",
  budget: "",
  workspaceType: "",
};

export default function Home() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMatchMode, setIsMatchMode] = useState(false);

  const [filters, setFilters] = useState(emptyFilters);
  const [amenities, setAmenities] = useState([]);

  const loadDefault = () => {
    setLoading(true);
    setIsMatchMode(false);
    api
      .get("/workspaces")
      .then((res) => setWorkspaces(res.data.workspaces))
      .catch(() =>
        setError(
          "Could not load workspaces. Make sure the backend is running and connected to MongoDB."
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(loadDefault, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const toggleAmenity = (amenity) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const hasAnyFilter =
    filters.location ||
    filters.numberOfPeople ||
    filters.area ||
    filters.budget ||
    filters.workspaceType ||
    amenities.length > 0;

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");

    if (!hasAnyFilter) {
      loadDefault();
      return;
    }

    setLoading(true);
    setIsMatchMode(true);
    try {
      const params = {};
      if (filters.location) params.location = filters.location;
      if (filters.numberOfPeople) params.numberOfPeople = filters.numberOfPeople;
      if (filters.area) params.area = filters.area;
      if (filters.budget) params.budget = filters.budget;
      if (filters.workspaceType) params.workspaceType = filters.workspaceType;
      if (amenities.length > 0) params.amenities = amenities.join(",");

      const res = await api.get("/workspaces/match", { params });
      setWorkspaces(res.data.results);
    } catch {
      setError("Could not run the search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters(emptyFilters);
    setAmenities([]);
    loadDefault();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Find your workspace</h1>
        <p className="auth-subtitle">
          Search by team size, area, budget, and location — we'll rank
          results by how well they match.
        </p>
      </div>

      <form className="search-bar form-card" onSubmit={handleSearch}>
        <div className="search-grid">
          <label className="field">
            <span>Location</span>
            <input
              type="text"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Bhubaneswar"
            />
          </label>
          <label className="field">
            <span>People</span>
            <input
              type="number"
              name="numberOfPeople"
              value={filters.numberOfPeople}
              onChange={handleFilterChange}
              min={1}
              placeholder="10"
            />
          </label>
          <label className="field">
            <span>Area (sq.ft)</span>
            <input
              type="number"
              name="area"
              value={filters.area}
              onChange={handleFilterChange}
              min={1}
              placeholder="500"
            />
          </label>
          <label className="field">
            <span>Budget (₹/day)</span>
            <input
              type="number"
              name="budget"
              value={filters.budget}
              onChange={handleFilterChange}
              min={0}
              placeholder="1000"
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select
              name="workspaceType"
              value={filters.workspaceType}
              onChange={handleFilterChange}
            >
              <option value="">Any</option>
              <option value="shared_desk">Shared desk</option>
              <option value="private_cabin">Private cabin</option>
              <option value="meeting_room">Meeting room</option>
            </select>
          </label>
        </div>

        <div className="amenity-grid search-amenities">
          {AMENITY_OPTIONS.map((a) => (
            <label key={a} className="amenity-checkbox">
              <input
                type="checkbox"
                checked={amenities.includes(a)}
                onChange={() => toggleAmenity(a)}
              />
              <span>{a.replace("_", " ")}</span>
            </label>
          ))}
        </div>

        <div className="search-actions">
          <button type="submit" className="btn-primary">
            {hasAnyFilter ? "Find matches" : "Show all"}
          </button>
          {hasAnyFilter && (
            <button type="button" className="btn-link" onClick={handleClear}>
              Clear filters
            </button>
          )}
        </div>
      </form>

      {loading && <p className="muted">Loading workspaces...</p>}
      {error && <div className="form-error">{error}</div>}

      {!loading && !error && workspaces.length === 0 && (
        <div className="empty-state">
          <p>No workspaces match your search.</p>
          <p className="muted">Try widening your filters, or clear them to see everything.</p>
        </div>
      )}

      <div className="workspace-list">
        {workspaces.map((ws) => (
          <Link to={`/workspaces/${ws._id}`} className="workspace-card" key={ws._id}>
            <div className="workspace-card-main">
              <div className="workspace-title-row">
                <h3>{ws.name}</h3>
                {isMatchMode && (
                  <span className="match-badge">{ws.matchScore}% match</span>
                )}
              </div>
              <p className="muted">{ws.location}</p>
              {ws.description && <p>{ws.description}</p>}
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
              <div>
                <span className="meta-label">Type</span>
                <span>{ws.workspaceType.replace("_", " ")}</span>
              </div>
              <div>
                <span className="meta-label">Capacity</span>
                <span>{ws.capacity} people</span>
              </div>
              <div>
                <span className="meta-label">Area</span>
                <span>{ws.area} sq.ft</span>
              </div>
              <div className="price">₹{ws.price}/day</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
