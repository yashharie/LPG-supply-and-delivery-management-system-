import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { FaBell, FaBoxes, FaExclamationTriangle, FaBellSlash } from "react-icons/fa";

const API = "http://127.0.0.1:8000/api";

const TYPE_ICON = {
  order_placed: <FaBoxes />,
  order_status: <FaBell />,
  low_stock:    <FaExclamationTriangle />,
};

const TYPE_COLOR = {
  order_placed: { bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", iconColor: "#3b82f6" },
  order_status: { bg: "#f0fdf4", border: "#bbf7d0", dot: "#16a34a", iconColor: "#16a34a" },
  low_stock:    { bg: "#fff7ed", border: "#fed7aa", dot: "#ea580c", iconColor: "#ea580c" },
};

const NotificationBell = ({ token }) => {
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [open,          setOpen]          = useState(false);
  const [dropPos,       setDropPos]       = useState({ top: 0, left: 0 });
  const dropRef = useRef(null);
  const bellRef = useRef(null);

  const fetchNotifications = useCallback(() => {
    if (!token) return;
    axios.get(`${API}/notifications?limit=15`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      setNotifications(r.data.notifications ?? []);
      setUnread(r.data.unread_count ?? 0);
    }).catch(() => {});
  }, [token]);

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id) => {
    await axios.post(`${API}/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await axios.post(`${API}/notifications/read-all`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const deleteOne = async (id, e) => {
    e.stopPropagation();
    await axios.delete(`${API}/notifications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications((p) => p.filter((n) => n.id !== id));
    if (!notifications.find((n) => n.id === id)?.read) {
      setUnread((u) => Math.max(0, u - 1));
    }
  };

  const handleOpen = () => {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      const dropWidth = 360;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Position to the right of the bell, or left if not enough room
      let left = rect.right + 8;
      if (left + dropWidth > viewportWidth) {
        left = rect.left - dropWidth - 8;
      }

      // Position below the bell, or above if not enough room
      let top = rect.top;
      const dropHeight = 480;
      if (top + dropHeight > viewportHeight) {
        top = Math.max(8, viewportHeight - dropHeight - 8);
      }

      setDropPos({ top, left });
    }
    setOpen((v) => !v);
    if (!open) fetchNotifications();
  };

  return (
    <div ref={dropRef} style={{ position: "relative", display: "inline-block" }}>

      {/* ── Bell button ── */}
      <button
        ref={bellRef}
        onClick={handleOpen}
        style={{
          position: "relative",
          background: open ? "rgba(255,255,255,0.15)" : "transparent",
          border: "none", borderRadius: 8,
          cursor: "pointer", padding: "6px 8px",
          fontSize: 16, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, transition: "background 0.15s, color 0.15s",
        }}
        title="Notifications"
        onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.color = "#94a3b8"; }}
      >
        <FaBell />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            background: "#ef4444", color: "#fff",
            fontSize: 9, fontWeight: 800,
            minWidth: 15, height: 15, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", border: "1.5px solid #0f172a",
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: "fixed",
          top: dropPos.top,
          left: dropPos.left,
          width: 360, maxHeight: 480,
          background: "#fff", borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          border: "1px solid #e2e8f0",
          zIndex: 99999, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>

          {/* Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 16px", borderBottom: "1px solid #f0f0f0",
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
              Notifications
              {unread > 0 && (
                <span style={{
                  marginLeft: 8, background: "#eff6ff", color: "#1e40af",
                  fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                }}>
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#1e62d4", fontSize: 12, fontWeight: 600,
              }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 24, marginBottom: 8, display: "flex", justifyContent: "center" }}><FaBellSlash /></div>
                <p style={{ margin: 0, fontSize: 14 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const tc = TYPE_COLOR[n.type] ?? { bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8", iconColor: "#94a3b8" };
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    style={{
                      display: "flex", gap: 12, padding: "12px 16px",
                      background: n.read ? "#fff" : tc.bg,
                      borderBottom: "1px solid #f8fafc",
                      cursor: n.read ? "default" : "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.background = n.read ? "#fff" : tc.bg}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: tc.bg, border: `1px solid ${tc.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, color: tc.iconColor
                    }}>
                      {TYPE_ICON[n.type] ?? <FaBell />}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: n.read ? 500 : 700, fontSize: 13,
                        color: "#0f172a", marginBottom: 2,
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      }}>
                        <span>{n.title}</span>
                        {!n.read && (
                          <span style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: tc.dot, flexShrink: 0, marginTop: 3, marginLeft: 6,
                          }} />
                        )}
                      </div>
                      <p style={{
                        margin: 0, fontSize: 12, color: "#64748b",
                        lineHeight: 1.5, wordBreak: "break-word",
                      }}>
                        {n.message}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{n.created_at}</span>
                        <button
                          onClick={(e) => deleteOne(n.id, e)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#cbd5e1", fontSize: 12, padding: 0,
                          }}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: "10px 16px", borderTop: "1px solid #f0f0f0",
              textAlign: "center", fontSize: 12, color: "#94a3b8",
            }}>
              Showing last {notifications.length} notifications • auto-refreshes every 30s
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
