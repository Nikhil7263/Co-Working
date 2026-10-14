import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClick = (notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="bell-button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="bell-dropdown">
          <div className="bell-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="btn-link" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="muted bell-empty">No notifications yet.</p>
          ) : (
            <div className="bell-list">
              {notifications.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  className={`bell-item ${n.isRead ? "" : "unread"}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="bell-item-message">{n.message}</span>
                  <span className="bell-item-time">{timeAgo(n.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
