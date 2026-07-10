/**
 * printInvoice(invoice, mode)
 *
 * Opens a new browser window with a styled, printable invoice/receipt.
 *
 * @param {object} invoice  — data returned from GET /api/orders/{id}/invoice
 * @param {string} mode     — "invoice" (admin/manager) | "receipt" (client)
 */
export function printInvoice(invoice, mode = "invoice") {
  const isReceipt = mode === "receipt";

  const fmt = (n) =>
    n != null
      ? `LKR ${parseFloat(n).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
      : "—";

  // Build items table rows
  const itemRows = (invoice.items ?? [])
    .map((item) => {
      const unitPrice = parseFloat(item.unit_price ?? 0);
      const qty       = parseInt(item.quantity ?? 0);
      const lineTotal = unitPrice * qty;
      return `
        <tr>
          <td>${item.brand ?? ""} ${item.name ?? ""}</td>
          <td style="text-align:center">${item.kgWeight ?? (item.weight ? item.weight + "kg" : "—")}</td>
          <td style="text-align:center">${qty}</td>
          <td style="text-align:right">${unitPrice > 0 ? fmt(unitPrice) : "—"}</td>
          <td style="text-align:right">${unitPrice > 0 ? fmt(lineTotal) : "—"}</td>
        </tr>`;
    })
    .join("");

  // Cylinder cost (sum of line totals)
  const cylinderCost = (invoice.items ?? []).reduce((s, i) => {
    const p = parseFloat(i.unit_price ?? 0);
    const q = parseInt(i.quantity ?? 0);
    return s + p * q;
  }, 0);

  const total      = parseFloat(invoice.total_amount ?? 0);
  const delivFee   = total - cylinderCost;

  const statusColor = {
    Delivered:          "#065f46",
    Approved:           "#1e40af",
    Pending:            "#92400e",
    "Out for Delivery": "#1e40af",
    Cancelled:          "#6b7280",
    Rejected:           "#991b1b",
  }[invoice.status] ?? "#334155";

  const title = isReceipt ? "Delivery Receipt" : "Order Invoice";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title} — ${invoice.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a202c; font-size: 13px; padding: 32px 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .brand { font-size: 26px; font-weight: 900; color: #1e40af; letter-spacing: -0.5px; }
    .brand span { color: #f59e0b; }
    .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 20px; font-weight: 800; color: #0f172a; }
    .doc-title .order-num { font-size: 13px; color: #64748b; margin-top: 4px; font-family: monospace; }
    .doc-title .status-badge {
      display: inline-block; margin-top: 6px; padding: 3px 12px;
      border-radius: 20px; font-size: 12px; font-weight: 700;
      background: #f0fdf4; color: ${statusColor};
    }
    .divider { border: none; border-top: 2px solid #e2e8f0; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .info-section h3 { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; }
    .info-section p { font-size: 13px; color: #334155; line-height: 1.6; }
    .info-section strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead tr { background: #1e40af; color: #fff; }
    thead th { padding: 10px 12px; font-size: 12px; font-weight: 600; text-align: left; }
    thead th:nth-child(2), thead th:nth-child(3) { text-align: center; }
    thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 10px 12px; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .totals-row.grand { font-size: 15px; font-weight: 800; border-top: 2px solid #1e40af; border-bottom: none; margin-top: 4px; padding-top: 10px; color: #1e40af; }
    .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer .note { font-size: 11px; color: #94a3b8; max-width: 380px; line-height: 1.5; }
    .footer .sig { text-align: right; font-size: 12px; color: #64748b; }
    .footer .sig strong { display: block; margin-top: 32px; border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 11px; }
    @media print {
      body { padding: 20px 28px; }
      button { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">Gas<span>Hub</span></div>
      <div class="brand-sub">LPG Gas Cylinder Delivery — Sri Lanka</div>
      <div class="brand-sub" style="margin-top:6px">
        ${invoice.warehouse_name ?? ""}<br/>
        ${invoice.warehouse_address ?? ""}
      </div>
    </div>
    <div class="doc-title">
      <h1>${title}</h1>
      <div class="order-num">${invoice.order_number}</div>
      <div class="status-badge">${invoice.status}</div>
      <div style="margin-top:8px;font-size:11px;color:#64748b">
        Issued: ${invoice.created_at ?? "—"}
        ${invoice.status === "Delivered" ? `<br/>Delivered: ${invoice.updated_at ?? "—"}` : ""}
      </div>
    </div>
  </div>

  <hr class="divider" />

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-section">
      <h3>Bill To</h3>
      <p>
        <strong>${invoice.client_name ?? "—"}</strong><br/>
        ${invoice.client_nic ? `NIC: ${invoice.client_nic}<br/>` : ""}
        ${invoice.client_phone ? `📞 ${invoice.client_phone}<br/>` : ""}
        ${invoice.client_email ? `✉ ${invoice.client_email}<br/>` : ""}
        ${invoice.client_address ? `📍 ${invoice.client_address}` : ""}
      </p>
    </div>
    <div class="info-section">
      <h3>Order Details</h3>
      <p>
        <strong>Order #:</strong> ${invoice.order_number}<br/>
        <strong>Type:</strong> ${invoice.order_type ?? "NORMAL"}<br/>
        <strong>Quantity:</strong> ${invoice.total_quantity} cylinders<br/>
        ${invoice.delivered_quantity != null ? `<strong>Delivered:</strong> ${invoice.delivered_quantity} cylinders<br/>` : ""}
        ${invoice.total_empty_returns ? `<strong>Returns:</strong> ${invoice.total_empty_returns} cylinders` : ""}
      </p>
    </div>
    <div class="info-section">
      <h3>Warehouse / Driver</h3>
      <p>
        <strong>${invoice.warehouse_name ?? "—"}</strong><br/>
        ${invoice.warehouse_address ?? ""}<br/>
        ${invoice.driver_name ? `<br/><strong>Driver:</strong> ${invoice.driver_name}` : ""}
      </p>
    </div>
  </div>

  <hr class="divider" />

  <!-- Items table -->
  <table>
    <thead>
      <tr>
        <th>Cylinder Type</th>
        <th style="text-align:center">Weight</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:16px">No item details available.</td></tr>`}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    ${cylinderCost > 0 ? `<div class="totals-row"><span>Cylinders</span><span>${fmt(cylinderCost)}</span></div>` : ""}
    ${delivFee > 0 ? `<div class="totals-row"><span>Delivery Fee</span><span>${fmt(delivFee)}</span></div>` : ""}
    <div class="totals-row grand"><span>TOTAL</span><span>${fmt(total)}</span></div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="note">
      ${isReceipt
        ? "Thank you for choosing GasHub! This receipt confirms full delivery of your order. Please keep it for your records."
        : "This invoice is generated by GasHub. Payment receipt uploaded by customer is on file. For queries contact GasHub support."}
      <br/><br/>
      <strong>GasHub</strong> · LPG Gas Delivery · Sri Lanka · info@gashub.lk · +94 70 123 4567
    </div>
    <div class="sig">
      <span style="color:#94a3b8;font-size:11px">Authorised by</span>
      <strong>GasHub Operations</strong>
    </div>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Popup blocked! Please allow popups for this site.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
