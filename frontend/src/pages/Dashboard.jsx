import { useAuth } from "../context/AuthContext";
import UserDashboard from "./UserDashboard";
import OwnerDashboard from "./OwnerDashboard";
import AdminDashboard from "./AdminDashboard";

// A single "/dashboard" route that renders the right view for the
// logged-in user's role. Admins see the platform-wide admin dashboard
// (they can still reach owner-only tools like Live Monitor directly).
export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null; // ProtectedRoute handles the redirect

  if (user.role === "admin") return <AdminDashboard />;
  if (user.role === "owner") return <OwnerDashboard />;
  return <UserDashboard />;
}
