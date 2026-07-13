import { useEffect, useState } from "react";
import axios from "axios";
import { confirmDialog, toast, errorAlert } from "../../utils/swal";
import { FaInbox, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminPages.css";

const API = "http://127.0.0.1:8000/api";

const TYPE_META = {
  feedback:  { label: "Feedback",  color: "#1e40af", bg: "#eff6ff", icon: "💬" },
  complaint: { label: "Complaint", color: "#dc2626", bg: "#fef2f2", icon: "🚨" },
  issue:     { label: "Issue",     color: "#d97706", bg: "#fffbeb", icon: "⚠️" },
};
const STATUS_META = {
  open:     { label: "Open",     color: "#d97706", bg: "#fffbeb" },
  reviewed: { label: "Reviewed", color: "#1e40af", bg: "#eff6ff" },
  resolved: { label: "Resolved", color: "#16a34a", bg: "#f0fdf4" },
};

const FeedbackInbox = () => {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statFilter, setStatFilter] = useState("all");
  const [selected,   setSelected]   = useState(null);
  const [notifications, setNotifications] = useState([]);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchNotifications = () => {
    axios.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        const complaints = (r.data.notifications ?? []).filter((n) => n.type === "complaint");
        setNotifications(complaints);
      })
      .catch(() => {});
  };

  const fetchItems = () => {
    setLoading(true);
    const params = {};
    if (typeFilter !== "all") params.type   = typeFilter;
    if (statFilter !== "all") params.status = statFilter;
    axios.get(`${API}/admin/feedback`, { headers: { Authorization: `Bearer ${token}` }, params })
      .then((r) => setItems(r.data))
      .catch(() => errorAlert("Load Failed", "Could not load feedback."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
    fetchNotifications();
  }, [typeFilter, statFilter]);

  const handleDelete = async (id) => {
    const ok = await confirmDialog({ title: "Delete this entry?", confirmText: "Delete", danger: true });
    if (!ok) return;
    try {
      await axios.delete(`${API}/admin/feedback/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast("Entry deleted.", "warning");
      if (selected?.id === id) setSelected(null);
      fetchItems();
    } catch { errorAlert("Delete Failed"); }
  };

  const counts = { all: items.length };
  items.forEach((i) => { counts[i.type]   = (counts[i.type]   ?? 0) + 1; });
  items.forEach((i) => { counts[i.status] = (counts[i.status] ?? 0) + 1; });

  return (
    <div className="ap-page">
      {/* ── Hero ── */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Support</div>
            <h1 className="ap-hero-title">Support Inbox</h1>
            <p className="ap-hero-sub">Customer feedback, complaints and issues</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaInbox style={{ fontSize: 12 }} />
              {items.length} submission{items.length !== 1 ? "s" : ""}
            </span>
            <button className="ap-hero-btn" onClick={() => { fetchItems(); fetchNotifications(); }}>
              <FaSync style={{ fontSize: 11 }} />
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* ── KPI strip ── */}
        <div className="ap-kpi-strip ap-kpi-strip-5" style={{ marginBottom: 24 }}>
          {[
            { label: "Total",      value: items.length,       accent: "#3b82f6", bg: "#eff6ff", icon: "📋", onClick: () => { setTypeFilter("all"); setStatFilter("all"); } },
            { label: "Complaints", value: counts.complaint ?? 0, accent: "#dc2626", bg: "#fef2f2", icon: "🚨", onClick: () => { setTypeFilter("complaint"); setStatFilter("all"); } },
            { label: "Issues",     value: counts.issue ?? 0,     accent: "#d97706", bg: "#fffbeb", icon: "⚠️", onClick: () => { setTypeFilter("issue"); setStatFilter("all"); } },
            { label: "Open",       value: counts.open ?? 0,      accent: "#f59e0b", bg: "#fffbeb", icon: "🔓", onClick: () => { setTypeFilter("all"); setStatFilter("open"); } },
            { label: "Resolved",   value: counts.resolved ?? 0,  accent: "#16a34a", bg: "#f0fdf4", icon: "✅", onClick: () => { setTypeFilter("all"); setStatFilter("resolved"); } },
          ].map((k, i) => (
            <div
              key={k.label}
              className="ap-kpi-card"
              onClick={k.onClick}
              style={{ borderBottomColor: k.accent, animationDelay: `${i * 0.06}s`, cursor: "pointer" }}
            >
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* ── Complaint alert strip ── */}
        {notifications.length > 0 && (
          <div className="ap-alert-strip" style={{ marginBottom: 20 }}>
            <div className="ap-alert-strip-title">
              🚨 Active Complaint Alerts ({notifications.length})
            </div>
            <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {notifications.map((n) => (
                <div key={n.id} className="ap-alert-row">
                  <span><strong>{n.created_at}:</strong> {n.message}</span>
                  {!n.read && (
                    <button
                      onClick={() => {
                        axios.post(`${API}/notifications/${n.id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } })
                          .then(() => { fetchNotifications(); fetchItems(); });
                      }}
                      className="ap-btn ap-btn-danger ap-btn-sm"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
          {/* Type filter */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Type</div>
            <div className="ap-pill-bar" style={{ marginBottom: 0 }}>
              {["all", "feedback", "complaint", "issue"].map((t) => (
                <button
                  key={t}
                  className={`ap-pill${typeFilter === t ? " active" : ""}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {TYPE_META[t]?.icon ?? "📋"} {t.charAt(0).toUpperCase() + t.slice(1)}
                  <span className="ap-pill-count">({counts[t] ?? 0})</span>
                </button>
              ))}
            </div>
          </div>
          {/* Status filter */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Status</div>
            <div className="ap-pill-bar" style={{ marginBottom: 0 }}>
              {["all", "open", "reviewed", "resolved"].map((s) => (
                <button
                  key={s}
                  className={`ap-pill${statFilter === s ? " active" : ""}`}
                  onClick={() => setStatFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Split layout ── */}
        <div className={`ap-feedback-layout ${selected ? "split" : "full"}`}>

          {/* List */}
          <div>
            {loading && (
              <div className="ap-card">
                <div className="ap-empty"><div className="ap-empty-icon">⏳</div><div className="ap-empty-text">Loading…</div></div>
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="ap-card">
                <div className="ap-empty">
                  <div className="ap-empty-icon">📭</div>
                  <div className="ap-empty-text">No submissions found.</div>
                  <div className="ap-empty-sub">Try changing the filter.</div>
                </div>
              </div>
            )}
            {items.map((item) => {
              const TM = TYPE_META[item.type]    ?? TYPE_META.feedback;
              const SM = STATUS_META[item.status] ?? STATUS_META.open;
              const isSelected = selected?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`ap-feedback-item${isSelected ? " selected" : ""}`}
                  onClick={() => setSelected(isSelected ? null : item)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, flexWrap: "wrap" }}>
                        <span className="ap-badge" style={{ background: TM.bg, color: TM.color }}>
                          {TM.icon} {TM.label}
                        </span>
                        <span className="ap-badge" style={{ background: SM.bg, color: SM.color }}>
                          {SM.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.subject}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {item.name ?? item.user?.name ?? "Anonymous"}
                        {item.email && ` · ${item.email}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, textAlign: "right" }}>
                      {new Date(item.created_at).toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="ap-detail-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Submission Detail</span>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 20, lineHeight: 1 }}
                >×</button>
              </div>

              {/* Badges */}
              <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  TYPE_META[selected.type] ?? TYPE_META.feedback,
                  STATUS_META[selected.status] ?? STATUS_META.open,
                ].map((m, i) => (
                  <span key={i} className="ap-badge" style={{ background: m.bg, color: m.color }}>
                    {m.label}
                  </span>
                ))}
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
                {selected.subject}
              </h3>

              <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 16px", lineHeight: 1.7 }}>
                From: <strong>{selected.name ?? selected.user?.name ?? "Anonymous"}</strong>
                {selected.email && ` · ${selected.email}`}<br />
                Submitted: {new Date(selected.created_at).toLocaleString()}
              </p>

              <div style={{
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                padding: "14px 16px",
                fontSize: 13.5,
                color: "#334155",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                marginBottom: 20,
              }}>
                {selected.message}
              </div>

              <button
                onClick={() => handleDelete(selected.id)}
                className="ap-btn ap-btn-danger ap-btn-full"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
              >
                🗑 Delete Submission
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default FeedbackInbox;
