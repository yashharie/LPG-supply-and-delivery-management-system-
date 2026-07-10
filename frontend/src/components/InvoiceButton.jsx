import { useState } from "react";
import axios from "axios";
import { FaFileInvoice, FaPrint } from "react-icons/fa";
import { printInvoice } from "../utils/printInvoice";

const API = "http://127.0.0.1:8000/api";

/**
 * InvoiceButton
 *
 * Props:
 *   orderId  — order ID
 *   token    — auth token
 *   mode     — "invoice" (admin/manager) | "receipt" (client)
 *   label    — optional button label override
 *   style    — optional extra inline styles
 */
const InvoiceButton = ({ orderId, token, mode = "invoice", label, style = {} }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await axios.get(`${API}/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.status) {
        printInvoice(res.data.invoice, mode);
      } else {
        alert(res.data.message ?? "Could not load invoice.");
      }
    } catch (err) {
      alert(err.response?.data?.message ?? "Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  };

  const isReceipt = mode === "receipt";
  const Icon      = isReceipt ? FaPrint : FaFileInvoice;
  const defaultLabel = isReceipt ? "Print Receipt" : "Invoice";

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isReceipt ? "Print delivery receipt" : "View / print invoice"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: isReceipt ? "6px 14px" : "4px 10px",
        borderRadius: 6,
        border: `1px solid ${isReceipt ? "#a7f3d0" : "#bfdbfe"}`,
        background: isReceipt ? "#f0fdf4" : "#eff6ff",
        color: isReceipt ? "#065f46" : "#1e40af",
        fontSize: 12,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <Icon style={{ fontSize: 12 }} />
      {loading ? "Loading…" : (label ?? defaultLabel)}
    </button>
  );
};

export default InvoiceButton;
