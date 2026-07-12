import { useEffect, useState } from "react";
import axios from "axios";
import { confirmDialog, toast, errorAlert } from "../../utils/swal";
import { FaMoneyBillWave, FaSync, FaCheckCircle } from "react-icons/fa";
import "../../styles/AdminPages.css";

const API     = "http://127.0.0.1:8000/api";
const STORAGE = "http://127.0.0.1:8000/storage/";

const fmt = (n) =>
  n != null ? `LKR ${parseFloat(n).toLocaleString("en-LK", { minimumFractionDigits: 2 })}` : "—";

const Refunds = () => {
  const [refunds,  setRefunds]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all"); // all | pending | refunded
  const [noteMap,  setNoteMap]  = useState({});     // orderId → note input value
  const token = localStorage.getItem("token");

  const fetchRefunds = () => {
    setLoading(true);
    axios.get(`${API}/admin/refunds`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setRefunds(r.data))
      .catch(() => errorAlert("Load Failed", "Could not load refunds."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRefunds(); }, []);

  const handleMarkRefunded = async (order) => {
    const ok = await confirmDialog({
      title:       `Mark refund as completed?`,
      text:        `Order #${order.order_number} — ${fmt(order.total_amount)}`,
      confirmText: "Yes, Mark Refunded",
      icon:        "question",
    });
    if (!ok) return;

    try {
      await axios.post(
        `${API}/admin/refunds/${order.id}/mark-refunded`,
        { refund_notes: noteMap[order.id] ?? "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast("Refund marked as completed. Client has been notified.");
      fetchRefunds();
    } catch (err) {
      errorAlert("Failed", err.response?.data?.message ?? "Could not complete refund.");
    }
  };

  const pendingCount  = refunds.filter((r) => r.payment_status === "Refund Pending").length;
  const refundedCount = refunds.filter((r) => r.payment_status === "Refunded").length;

  const displayed = filter === "pending"  ? refunds.filter((r) => r.payment_status === "Refund Pending")
                  : filter === "refunded" ? refunds.filter((r) => r.payment_status === "Refunded")
                  : refunds;

  if (loading) return (
    <div className="ap-page">
      <div className="ap-hero"><div className="ap-hero-ring" /><div className="ap-hero-inner"><div>
        <div className="ap-hero-eyebrow">Admin · Finance</div>
        <h1 className="ap-hero-title">Refund Management</h1>
      </div></div></div>
      <div className="ap-body"><div className="ap-card"><div className="ap-empty">
        <div className="ap-empty-icon">⏳</div><div className="ap-empty-text">Loading refunds…</div>
      </div></div></div>
    </div>
  );

  return (
    <div className="ap-page">
      {/* Hero */}
      <div className="ap-hero">
        <div className="ap-hero-ring" />
        <div className="ap-hero-inner">
          <div>
            <div className="ap-hero-eyebrow">Admin · Finance</div>
            <h1 className="ap-hero-title">Refund Management</h1>
            <p className="ap-hero-sub">Process refunds for cancelled paid orders</p>
          </div>
          <div className="ap-hero-actions">
            <span className="ap-hero-badge">
              <FaMoneyBillWave style={{ fontSize: 12 }} />
              {pendingCount} pending · {refundedCount} completed
            </span>
            <button className="ap-hero-btn" onClick={fetchRefunds}>
              <FaSync style={{ fontSize: 11 }} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="ap-body">

        {/* KPI strip */}
        <div className="ap-kpi-strip ap-kpi-strip-3" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Refund Cases", value: refunds.length,   accent: "#3b82f6", bg: "#eff6ff", icon: "📋" },
            { label: "Refund Pending",     value: pendingCount,     accent: "#f59e0b", bg: "#fffbeb", icon: "⏳" },
            { label: "Refunded",           value: refundedCount,    accent: "#16a34a", bg: "#f0fdf4", icon: "✅" },
          ].map((k, i) => (
            <div key={k.label} className="ap-kpi-card" style={{ borderBottomColor: k.accent, animationDelay: `${i * 0.08}s` }}>
              <div className="ap-kpi-bg-circle" style={{ background: k.bg }} />
              <div className="ap-kpi-icon" style={{ color: k.accent }}>{k.icon}</div>
              <div className="ap-kpi-label">{k.label}</div>
              <div className="ap-kpi-value" style={{ color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="ap-pill-bar">
          {[
            { key: "all",      label: "All",           count: refunds.length },
            { key: "pending",  label: "⏳ Pending",    count: pendingCount },
            { key: "refunded", label: "✅ Completed",  count: refundedCount },
          ].map((f) => (
            <button
              key={f.key}
              className={`ap-pill${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="ap-pill-count">({f.count})</span>
            </button>
          ))}
        </div>

        {/* Refund list */}
        {displayed.length === 0 ? (
          <div className="ap-card">
            <div className="ap-empty">
              <div className="ap-empty-icon">💰</div>
              <div className="ap-empty-text">No refunds found.</div>
              <div className="ap-empty-sub">Cancelled paid orders will appear here.</div>
            </div>
          </div>
        ) : (
          displayed.map((r) => {
            const isPending = r.payment_status === "Refund Pending";
            return (
              <div key={r.id} className="ap-row-card" style={{
                borderLeft: `4px solid ${isPending ? "#f59e0b" : "#16a34a"}`,
              }}>
                {/* Header */}
                <div className="ap-row-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: "#1e40af" }}>
                      #{r.order_number}
                    </span>
                    <span className={`ap-badge ${isPending ? "ap-badge-warning" : "ap-badge-approved"}`}>
                      {isPending ? "⏳ Refund Pending" : "✅ Refunded"}
                    </span>
                    <span className="ap-badge ap-badge-cancelled">Cancelled</span>
                  </div>
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    {r.cancelled_at ? new Date(r.cancelled_at).toLocaleString() : "—"}
                  </span>
                </div>

                {/* Info grid */}
                <div className="ap-info-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  <div className="ap-info-cell">
                    <div className="ap-info-cell-label">Client</div>
                    <div className="ap-info-cell-value">{r.client_name ?? "—"}</div>
                    {r.client_email && <div className="ap-info-cell-sub">{r.client_email}</div>}
                    {r.client_phone && <div className="ap-info-cell-sub">📞 {r.client_phone}</div>}
                  </div>

                  <div className="ap-info-cell">
                    <div className="ap-info-cell-label">Refund Amount</div>
                    <div className="ap-info-cell-value" style={{ fontSize: 17, fontWeight: 800, color: "#059669" }}>
                      {fmt(r.total_amount)}
                    </div>
                    <div className="ap-info-cell-sub">Warehouse: {r.warehouse_name ?? "—"}</div>
                  </div>

                  <div className="ap-info-cell">
                    <div className="ap-info-cell-label">Cancellation Reason</div>
                    <div className="ap-info-cell-value" style={{ fontSize: 13 }}>
                      {r.cancellation_reason ?? <em style={{ color: "#aaa" }}>Not provided</em>}
                    </div>
                  </div>

                  {r.payment_status === "Refunded" && (
                    <div className="ap-info-cell" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                      <div className="ap-info-cell-label">Refund Completed</div>
                      <div className="ap-info-cell-value" style={{ color: "#065f46" }}>
                        {r.refunded_at ? new Date(r.refunded_at).toLocaleString() : "—"}
                      </div>
                      {r.refunded_by_name && <div className="ap-info-cell-sub">By: {r.refunded_by_name}</div>}
                      {r.refund_notes && <div className="ap-info-cell-sub">Note: {r.refund_notes}</div>}
                    </div>
                  )}

                  {r.receipt_path && (
                    <div className="ap-info-cell">
                      <div className="ap-info-cell-label">Payment Receipt</div>
                      <a
                        href={STORAGE + r.receipt_path}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#1e62d4", fontWeight: 600, fontSize: 13 }}
                      >
                        View Receipt ↗
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions for pending refunds */}
                {isPending && (
                  <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{
                        display: "block", fontSize: 11, fontWeight: 700,
                        color: "#64748b", textTransform: "uppercase",
                        letterSpacing: 0.4, marginBottom: 5,
                      }}>
                        Refund Notes (optional)
                      </label>
                      <input
                        className="ap-input"
                        placeholder="e.g. Bank transfer completed — ref #123"
                        value={noteMap[r.id] ?? ""}
                        onChange={(e) => setNoteMap((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        style={{ maxWidth: 420 }}
                      />
                    </div>
                    <button
                      onClick={() => handleMarkRefunded(r)}
                      className="ap-btn ap-btn-success"
                      style={{ padding: "10px 22px" }}
                    >
                      <FaCheckCircle style={{ fontSize: 13 }} /> Mark as Refunded
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Refunds;
