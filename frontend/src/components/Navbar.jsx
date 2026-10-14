import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        Smart Co-Working
      </Link>
      <nav className="navbar-links">
        <Link to="/">Explore</Link>
        {user && <Link to="/dashboard">Dashboard</Link>}
        {user && user.role === "user" && (
          <Link to="/my-bookings">My bookings</Link>
        )}
        {user && (user.role === "owner" || user.role === "admin") && (
          <>
            <Link to="/my-workspaces">My workspaces</Link>
            <Link to="/add-workspace">Add workspace</Link>
            <Link to="/live-monitor">Live monitor</Link>
            <Link to="/booking-requests">Booking requests</Link>
          </>
        )}
        {user && user.role === "admin" && (
          <Link to="/admin/workspaces">Admin approvals</Link>
        )}
        {user ? (
          <>
            <NotificationBell />
            <span className="navbar-user">{user.name}</span>
            <button className="btn-link" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn-primary-small">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
