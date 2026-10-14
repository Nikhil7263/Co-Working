import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wrap a route element: <ProtectedRoute roles={["owner","admin"]}><AddWorkspace /></ProtectedRoute>
// roles omitted = any logged-in user is allowed.
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
