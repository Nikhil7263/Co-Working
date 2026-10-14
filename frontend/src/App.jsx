import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AddWorkspace from "./pages/AddWorkspace";
import MyWorkspaces from "./pages/MyWorkspaces";
import WorkspaceDetail from "./pages/WorkspaceDetail";
import MyBookings from "./pages/MyBookings";
import BookingRequests from "./pages/BookingRequests";
import AdminWorkspaces from "./pages/AdminWorkspaces";
import LiveMonitor from "./pages/LiveMonitor";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/workspaces/:id" element={<WorkspaceDetail />} />
            <Route
              path="/add-workspace"
              element={
                <ProtectedRoute roles={["owner", "admin"]}>
                  <AddWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-workspaces"
              element={
                <ProtectedRoute roles={["owner", "admin"]}>
                  <MyWorkspaces />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <MyBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-requests"
              element={
                <ProtectedRoute roles={["owner", "admin"]}>
                  <BookingRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/workspaces"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminWorkspaces />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-monitor"
              element={
                <ProtectedRoute roles={["owner", "admin"]}>
                  <LiveMonitor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
