import { useState, useEffect, useCallback, useRef } from "react";
import { FaMapMarkerAlt, FaShoppingCart } from "react-icons/fa";
import axios from "axios";
import Swal from "sweetalert2";
import "../../../styles/GasBookingTab.css";

const API = "http://127.0.0.1:8000/api";

const calcDeliveryFee = (distanceKm) =>
  Math.max(100, Math.round(distanceKm) * 100 + 100);

const emptyItem = (types) => ({
  id: Date.now() + Math.random(),
  cylinder_type_id: String(types[0]?.id ?? ""),
  quantity: 20,
  emptyReturns: 0,
});

const Banner = ({ bg, color, border, icon, children }) => (
  <div style={{
    background: bg, color, padding: "13px 16px",
    borderRadius: 10, marginBottom: 14, lineHeight: 1.6, fontSize: 13,
    border: `1.5px solid ${border ?? color + "33"}`,
    display: "flex", alignItems: "flex-start", gap: 10,
  }}>
    {icon && <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>}
    <div style={{ fontWeight: 600 }}>{children}</div>
  </div>
);

const GasBookingTab = ({ currentUser, token, setCurrentTab }) => {
  const [cylinderTypes,    setCylinderTypes]    = useState([]);
  const [orderItems,       setOrderItems]       = useState([]);
  const [nearest,          setNearest]          = useState(null);
  const [needsChoice,      setNeedsChoice]      = useState(false);
  const [candidates,       setCandidates]       = useState([]);
  const [chosenWarehouse,  setChosenWarehouse]  = useState(null);
  const [nearLoading,      setNearLoading]      = useState(false);
  const [nearError,        setNearError]        = useState("");
  const [warehouseStock,   setWarehouseStock]   = useState([]);
  const [stockLoading,     setStockLoading]     = useState(false);
  const [receipt,          setReceipt]          = useState(null);
  const [submitting,       setSubmitting]       = useState(false);
  const [submitMsg,        setSubmitMsg]        = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [step,             setStep]             = useState("order");
  const [partialData,      setPartialData]      = useState(null);
  const [partialForm,      setPartialForm]      = useState(null);
  const [orderDecision,    setOrderDecision]    = useState(null);

  const debounceRef = useRef(null);
  const isProfileComplete = !!(currentUser?.latitude && currentUser?.longitude);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/cylinder-types`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { const t = Array.isArray(r.data) ? r.data : []; setCylinderTypes(t); if (t.length) setOrderItems([emptyItem(t)]); })
      .catch(console.error);
  }, [token]);

  const totalQty     = orderItems.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const totalReturns = orderItems.reduce((s, i) => s + Number(i.emptyReturns || 0), 0);
  const cylinderCost = orderItems.reduce((s, i) => {
    const ct = cylinderTypes.find((c) => String(c.id) === String(i.cylinder_type_id));
    return s + (ct ? parseFloat(ct.price) * Number(i.quantity || 0) : 0);
  }, 0);
  const effectiveWarehouse = chosenWarehouse ?? nearest;
  const distanceKm  = effectiveWarehouse?.distance_km ?? 0;
  const deliveryFee = distanceKm > 0 ? calcDeliveryFee(distanceKm) : 0;
  const grandTotal  = cylinderCost + deliveryFee;

  useEffect(() => {
    const errs = [];
    orderItems.forEach((item, idx) => {
      if (Number(item.emptyReturns || 0) > Number(item.quantity || 0))
        errs.push(`Row ${idx + 1}: Returns cannot exceed quantity.`);
    });
    if (totalQty > 0 && totalQty < 20) errs.push("Minimum total order is 20 cylinders.");
    orderItems.forEach((item, idx) => {
      if (Number(item.quantity || 0) > 100)
        errs.push(`Row ${idx + 1}: Maximum is 100 cylinders per cylinder type.`);
    });
    setValidationErrors(errs);
  }, [orderItems, totalQty]);

  const fetchNearest = useCallback(() => {
    if (!currentUser?.latitude || !currentUser?.longitude || !token) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setNearLoading(true); setNearError("");
      setNeedsChoice(false); setCandidates([]); setChosenWarehouse(null);
      try {
        const res = await axios.get(`${API}/warehouse/nearest`, {
          headers: { Authorization: `Bearer ${token}` },
          // NOTE: qty NOT passed here — nearest is based on location only.
          // Stock sufficiency is checked at submit time via checkStock.
          params: { lat: currentUser.latitude, lng: currentUser.longitude },
        });
        if (!res.data.status) { setNearest(null); setNearError(res.data.message ?? "No warehouse available."); }
        else if (res.data.needs_user_choice) { setNearest(null); setNeedsChoice(true); setCandidates(res.data.candidates ?? []); }
        else { setNearest(res.data.nearest); }
      } catch (err) {
        setNearest(null);
        setNearError(err.response?.data?.message ?? "Could not find a warehouse.");
      } finally { setNearLoading(false); }
    }, 600);
  // IMPORTANT: totalQty is NOT in deps — we don't re-fetch nearest on every quantity change
  }, [currentUser, token]);

  useEffect(() => {
    // Only fetch nearest when profile is complete (has lat/lng)
    // This runs ONCE when the tab loads, not on every quantity change
    if (isProfileComplete) fetchNearest();
    return () => clearTimeout(debounceRef.current);
  }, [fetchNearest, isProfileComplete]);

  useEffect(() => {
    const wh = chosenWarehouse ?? nearest;
    if (!wh?.id || !token) { setWarehouseStock([]); return; }
    setStockLoading(true);
    axios.get(`${API}/warehouse/${wh.id}/stock`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setWarehouseStock(Array.isArray(r.data) ? r.data : []))
      .catch(() => setWarehouseStock([]))
      .finally(() => setStockLoading(false));
  }, [nearest, chosenWarehouse, token]);

  const addItem    = () => setOrderItems((p) => [...p, { ...emptyItem(cylinderTypes), id: Date.now() + Math.random() }]);
  const removeItem = (id) => setOrderItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id, field, val) => setOrderItems((p) => p.map((i) => i.id === id ? { ...i, [field]: val } : i));

  /* Step 1: Confirm Order — check stock, show popup only for partial/pre-order */
  const handleProceed = async (e) => {
    e.preventDefault();
    setSubmitMsg("");
    if (validationErrors.length > 0) return setSubmitMsg("Error: " + validationErrors[0]);
    if (!effectiveWarehouse) return setSubmitMsg("Error: No warehouse selected.");
    if (totalQty < 20) return setSubmitMsg("Error: Minimum order is 20 cylinders.");

    const itemsPayload = orderItems.map((i) => {
      const ct = cylinderTypes.find((c) => String(c.id) === String(i.cylinder_type_id));
      return { cylinder_type_id: Number(i.cylinder_type_id), brand: ct?.brand?.name ?? "", kgWeight: ct ? `${ct.weight}kg` : "", name: ct?.name ?? "", quantity: Number(i.quantity), emptyReturns: Number(i.emptyReturns || 0), unit_price: ct ? parseFloat(ct.price) : 0 };
    });

    const orderData = {
      items: JSON.stringify(itemsPayload),
      total_quantity: String(totalQty),
      total_empty_returns: String(totalReturns),
      total_cost: cylinderCost.toFixed(2),
      ...(effectiveWarehouse ? { warehouse_id: String(effectiveWarehouse.id) } : {}),
    };

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/orders/check-stock`, orderData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      setPartialForm(orderData);
      if (!res.data.status) { setSubmitMsg("Error: " + (res.data.message ?? "Could not check stock.")); return; }
      if (res.data.needs_user_choice) {
        setNearest(null);
        setNeedsChoice(true);
        setCandidates(res.data.candidates ?? []);
        setSubmitMsg("Multiple warehouses matched equally. Please choose one above.");
        return;
      }
      if (!res.data.partial) {
        // Case A: Full stock — NO popup, go straight to payment
        setOrderDecision("normal");
        setStep("payment");
      } else {
        // Case B / C: Partial or Pre-order — show popup
        setPartialData(res.data);
        setOrderDecision(res.data.order_type === "PRE_ORDER" ? "oos" : "partial");
      }
    } catch (err) {
      const errs = err.response?.data?.errors;
      setSubmitMsg("Error: " + (errs ? Object.values(errs)[0]?.[0] : err.response?.data?.message ?? "An error occurred."));
    } finally { setSubmitting(false); }
  };

  /* Modal choice handler */
  const handlePartialConfirm = (choice) => {
    if (choice === "change_qty") {
      // User wants to change quantity — close modal, go back to form
      setPartialData(null); setPartialForm(null); setOrderDecision(null);
      return;
    }
    if (choice === "cancel") {
      setPartialData(null); setPartialForm(null); setOrderDecision(null);
      return;
    }
    if (choice === "available_only") {
      // Order only available amount — no reservation
      const availQty = partialData.available_qty;
      const ratio = availQty / partialData.requested_qty;
      setPartialForm(prev => ({ ...prev, total_quantity: String(availQty), total_cost: (parseFloat(prev.total_cost) * ratio).toFixed(2), _available_qty: availQty, _pending_qty: 0 }));
      setOrderDecision("normal");
      setPartialData(null);
      setStep("payment");
    } else {
      // "proceed" — partial delivery or pre-order with reservation
      setPartialForm(prev => ({ ...prev, _available_qty: partialData.available_qty, _pending_qty: partialData.pending_qty }));
      setPartialData(null);
      setStep("payment");
    }
  };

  /* Step 2: Final submit with receipt */
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!receipt) return setSubmitMsg("Error: Please upload your payment receipt.");
    setSubmitting(true); setSubmitMsg("");
    const fd = new FormData();
    Object.entries(partialForm).forEach(([k, v]) => { if (!k.startsWith("_")) fd.append(k, v); });
    fd.append("payment_receipt", receipt);
    try {
      let res;
      if (orderDecision === "normal") {
        res = await axios.post(`${API}/orders/place`, fd, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        fd.append("available_qty", String(partialForm?._available_qty ?? 0));
        res = await axios.post(`${API}/orders/place-partial`, fd, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (res.data.status) {
        const isOOS = orderDecision === "oos";
        const isPartial = orderDecision === "partial";
        const fee = res.data.delivery_fee ?? deliveryFee;
        await Swal.fire({
          icon: "success",
          title: isOOS ? "Pre-Order Placed! ⏳" : isPartial ? "Partial Order Confirmed! 📦" : "Order Placed! 🎉",
          html: `<div style="text-align:left;font-size:14px;line-height:1.9">
            <b>Warehouse:</b> ${res.data.warehouse?.name ?? "—"}<br/>
            ${isOOS ? `<b>Reserved:</b> ${partialForm.total_quantity} cylinders — delivered once stock arrives<br/>` :
              isPartial ? `<b>Delivering now:</b> ${res.data.available_qty ?? partialForm._available_qty} cylinders<br/><b>Reserved:</b> ${res.data.pending_qty ?? partialForm._pending_qty} cylinders (auto-delivered when restocked)<br/>` :
              `<b>Cylinders:</b> ${partialForm.total_quantity}<br/>`}
            <b>Delivery Fee:</b> LKR ${fee.toLocaleString()}<br/><br/>
            <span style="color:#065f46;font-weight:600">✅ ${isOOS ? "We will deliver your order as stock becomes available." : isPartial ? "Remaining cylinders delivered automatically as stock arrives." : "Your order is Pending review by the manager."}</span>
          </div>`,
          confirmButtonText: "View My Orders", confirmButtonColor: "#1e40af",
          showCancelButton: true, cancelButtonText: "Close", cancelButtonColor: "#64748b",
        }).then((r) => { if (r.isConfirmed) setCurrentTab?.("history"); });
        resetForm();
      } else {
        setSubmitMsg("Error: " + (res.data.message ?? "Order failed."));
      }
    } catch (err) {
      const errs = err.response?.data?.errors;
      setSubmitMsg("Error: " + (errs ? Object.values(errs)[0]?.[0] : err.response?.data?.message ?? "An error occurred."));
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    if (cylinderTypes.length) setOrderItems([emptyItem(cylinderTypes)]);
    setReceipt(null); setNearest(null); setNeedsChoice(false);
    setCandidates([]); setChosenWarehouse(null); setSubmitMsg("");
    setStep("order"); setPartialData(null); setPartialForm(null); setOrderDecision(null);
    setTimeout(fetchNearest, 1000);
  };

  if (!isProfileComplete) {
    return (
      <div className="client-card" style={{ textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 32, marginBottom: 12, color: "#3b82f6" }}><FaMapMarkerAlt /></div>
        <h3 style={{ color: "#0f172a", marginBottom: 8 }}>Location Required</h3>
        <p style={{ color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>Please set your phone number and delivery location in <strong>Profile Settings</strong> before placing an order.</p>
        <button className="client-action-btn" style={{ width: "auto", padding: "10px 28px", marginTop: 0 }} onClick={() => setCurrentTab?.("profile")}>Go to Profile Settings →</button>
      </div>
    );
  }
  if (!cylinderTypes.length) return <div className="client-card" style={{ padding: 48, textAlign: "center" }}><p style={{ color: "#64748b" }}>Loading cylinder types…</p></div>;

  return (
    <div className="client-card">
      <h2 className="client-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}><FaShoppingCart /> Place Gas Order</h2>

      {nearLoading && <Banner bg="#f0f9ff" color="#0369a1" border="#bae6fd" icon="🔍">Finding nearest warehouse…</Banner>}
      {!nearLoading && nearest && !needsChoice && (
        <div style={{ background:"linear-gradient(135deg,#eff6ff,#dbeafe)", border:"1.5px solid #bfdbfe", borderRadius:12, padding:"14px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:"#1e3a8a", marginBottom:3 }}>🏭 {nearest.name}</div>
            <div style={{ fontSize:13, color:"#3b82f6" }}>{nearest.address}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"#64748b", marginBottom:2 }}>{nearest.distance_km} km away · {nearest.stock} cylinders</div>
            <div style={{ fontWeight:800, fontSize:16, color:"#1e40af" }}>LKR {calcDeliveryFee(nearest.distance_km).toLocaleString()}<span style={{ fontSize:11, fontWeight:500, color:"#64748b", marginLeft:4 }}>delivery</span></div>
          </div>
        </div>
      )}
      {!nearLoading && needsChoice && (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <p style={{ fontWeight: 700, color: "#92400e", marginBottom: 10 }}>Multiple warehouses matched equally. Please choose one:</p>
          {candidates.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 8, borderRadius: 8, cursor: "pointer", border: `2px solid ${chosenWarehouse?.id === c.id ? "#1e62d4" : "#e2e8f0"}`, background: chosenWarehouse?.id === c.id ? "#eff6ff" : "#fff" }}>
              <input type="radio" name="warehouse_choice" value={c.id} checked={chosenWarehouse?.id === c.id} onChange={() => setChosenWarehouse(c)} />
              <div><strong>{c.name}</strong> — {c.address}<br /><span style={{ fontSize: 12, color: "#64748b" }}>{c.distance_km} km | Stock: {c.stock} | Fee: LKR {calcDeliveryFee(c.distance_km).toLocaleString()}</span></div>
            </label>
          ))}
        </div>
      )}
      {!nearLoading && nearError && <Banner bg="#fef2f2" color="#dc2626" border="#fecaca" icon="⚠️">{nearError}</Banner>}

      {!nearLoading && (nearest || chosenWarehouse) && (
        <div style={{ background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"16px 20px", marginBottom:18 }}>
          <p style={{ fontWeight:700, fontSize:13, color:"#334155", marginBottom:12, display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:15 }}>📦</span> Available Stock at {(chosenWarehouse ?? nearest).name}
          </p>
          {stockLoading ? (
            <p style={{ fontSize:13, color:"#64748b" }}>Loading stock…</p>
          ) : warehouseStock.length === 0 ? (
            <p style={{ fontSize:13, color:"#94a3b8" }}>No stock details available.</p>
          ) : (
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {warehouseStock.map((s) => (
                <div key={s.cylinder_type_id} style={{
                  background: s.quantity > 0 ? "#fff" : "#fef2f2",
                  border: `1.5px solid ${s.quantity > 0 ? "#bfdbfe" : "#fecaca"}`,
                  borderRadius:10, padding:"10px 16px", minWidth:148,
                  boxShadow:"0 1px 3px rgba(15,23,42,.04)",
                }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>{s.brand} {s.name}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginBottom:6 }}>{s.weight} kg</div>
                  <div style={{
                    fontSize:15, fontWeight:800,
                    color: s.quantity > 0 ? "#1e40af" : "#dc2626",
                    display:"flex", alignItems:"center", gap:5,
                  }}>
                    {s.quantity > 0 ? (
                      <><span style={{ fontSize:10, background:"#dbeafe", color:"#1e40af", padding:"1px 6px", borderRadius:8 }}>IN STOCK</span> {s.quantity}</>
                    ) : (
                      <span style={{ fontSize:11, background:"#fee2e2", color:"#dc2626", padding:"2px 8px", borderRadius:8, fontWeight:700 }}>OUT OF STOCK</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "order" && (
        <form onSubmit={handleProceed} style={{ marginTop:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:"#334155", margin:0, textTransform:"uppercase", letterSpacing:0.6 }}>Order Items</h3>
            <span style={{ fontSize:11, color:"#94a3b8" }}>Min. 20 · Max. 100 per type</span>
          </div>

          {orderItems.map((item) => {
            const ct = cylinderTypes.find((c) => String(c.id) === String(item.cylinder_type_id));
            const rowTotal = ct ? parseFloat(ct.price) * Number(item.quantity || 0) : 0;
            const rowErr = Number(item.emptyReturns) > Number(item.quantity);
            return (
              <div key={item.id} className={`booking-item-row${rowErr ? " has-error" : ""}`}>
                <div>
                  <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5, fontWeight:600 }}>Cylinder Type</label>
                  <select className="client-dropdown" value={String(item.cylinder_type_id)} onChange={(e) => updateItem(item.id, "cylinder_type_id", e.target.value)} required>
                    {cylinderTypes.map((ct) => {
                      const s = warehouseStock.find((s) => String(s.cylinder_type_id) === String(ct.id));
                      return (
                        <option key={ct.id} value={String(ct.id)}>
                          {ct.brand?.name} — {ct.name} ({ct.weight}kg) — LKR {parseFloat(ct.price).toLocaleString()}
                          {warehouseStock.length > 0 && s && s.quantity === 0 ? " [Out of Stock]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:5, fontWeight:600 }}>Qty</label>
                  <input type="number" min={1} max={100} className="client-input" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize:11, color: rowErr ? "#dc2626" : "#64748b", display:"block", marginBottom:5, fontWeight:600 }}>
                    Returns {rowErr && "⚠️"}
                  </label>
                  <input type="number" min={0} max={item.quantity} className="client-input" value={item.emptyReturns} onChange={(e) => updateItem(item.id, "emptyReturns", e.target.value)} style={{ borderColor: rowErr ? "#fca5a5" : undefined }} />
                </div>
                <div style={{ fontWeight:800, fontSize:13, textAlign:"right", color:"#1e40af", paddingBottom:2 }}>
                  LKR {rowTotal.toLocaleString()}
                </div>
                {orderItems.length > 1 && (
                  <button type="button" onClick={() => removeItem(item.id)} style={{ background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:7, width:32, height:32, cursor:"pointer", fontWeight:700, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                )}
              </div>
            );
          })}

          <button type="button" onClick={addItem} style={{ background:"#fff", border:"1.5px dashed #bfdbfe", color:"#3b82f6", padding:"8px 16px", borderRadius:8, cursor:"pointer", marginBottom:18, fontSize:13, fontWeight:600, width:"100%", transition:"all .15s" }}>
            + Add Another Cylinder Type
          </button>

          {validationErrors.map((e, i) => (
            <div key={i} style={{ background:"#fef2f2", color:"#dc2626", padding:"10px 14px", borderRadius:8, marginBottom:8, fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:7 }}>⚠️ {e}</div>
          ))}

          {/* Price Summary */}
          <div style={{ background:"linear-gradient(135deg,#eff6ff,#f0f9ff)", borderRadius:12, padding:"18px 20px", marginBottom:18, border:"1.5px solid #bfdbfe" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.8, marginBottom:12 }}>Order Summary</div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
              <span style={{ color:"#475569" }}>Cylinders ({totalQty})
                {totalQty > 0 && totalQty < 20 && <span style={{ color:"#dc2626", marginLeft:8, fontSize:12, fontWeight:700 }}>min 20 required</span>}
              </span>
              <span style={{ fontWeight:700, color:"#0f172a" }}>LKR {cylinderCost.toLocaleString("en-LK", { minimumFractionDigits:2 })}</span>
            </div>
            {deliveryFee > 0 && (
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13 }}>
                <span style={{ color:"#475569" }}>Delivery fee <span style={{ fontSize:11, color:"#94a3b8" }}>({distanceKm} km)</span></span>
                <span style={{ fontWeight:700, color:"#0f172a" }}>LKR {deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div style={{ borderTop:"1.5px solid #bfdbfe", paddingTop:12, marginTop:4, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:800, fontSize:14, color:"#1e40af" }}>Total Amount</span>
              <span style={{ fontWeight:900, fontSize:24, color:"#0f172a" }}>LKR {grandTotal.toLocaleString("en-LK", { minimumFractionDigits:2 })}</span>
            </div>
            {totalReturns > 0 && (
              <div style={{ marginTop:8, fontSize:12, color:"#065f46", display:"flex", alignItems:"center", gap:5 }}>
                ♻️ {totalReturns} empty cylinder{totalReturns !== 1 ? "s" : ""} to return
              </div>
            )}
          </div>

          {submitMsg && (
            <div style={{ padding:"12px 16px", borderRadius:9, marginBottom:16, background:"#fef2f2", color:"#dc2626", fontWeight:600, fontSize:13, border:"1px solid #fecaca", display:"flex", alignItems:"center", gap:7 }}>
              ⚠️ {submitMsg.replace("Error: ", "")}
            </div>
          )}

          <button type="submit" className="client-action-btn"
            disabled={submitting || !effectiveWarehouse || totalQty < 20 || validationErrors.length > 0 || (needsChoice && !chosenWarehouse)}>
            {submitting ? "Checking stock…" : "Continue to Payment →"}
          </button>
        </form>
      )}

      {/* Partial / Pre-order popup — only shown when stock is insufficient */}
      {partialData && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 460, width: "90%", boxShadow: "0 20px 60px rgba(15,23,42,0.25)", fontFamily: "'Segoe UI',system-ui,sans-serif", maxHeight: "90vh", overflowY: "auto" }}>

            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{partialData.order_type === "PRE_ORDER" ? "🚫" : "📦"}</div>
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                {partialData.order_type === "PRE_ORDER" ? "This Item is Out of Stock" : "Limited Stock Available"}
              </h3>
            </div>

            {/* Reason box */}
            <div style={{ background: partialData.order_type === "PRE_ORDER" ? "#fee2e2" : "#fffbeb", border: `1px solid ${partialData.order_type === "PRE_ORDER" ? "#fca5a5" : "#fcd34d"}`, borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 13, color: partialData.order_type === "PRE_ORDER" ? "#991b1b" : "#92400e", lineHeight: 1.7 }}>
              {partialData.order_type === "PRE_ORDER"
                ? `This item is currently out of stock at ${partialData.warehouse_name}. Reason: The selected warehouse has no stock available. You can place this as a pre-order. We will deliver it once stock is refilled.`
                : `Only ${partialData.available_qty} cylinders are currently available at ${partialData.warehouse_name}. Reason: Current stock is lower than your requested quantity of ${partialData.requested_qty}. We can deliver ${partialData.available_qty} now and deliver the remaining ${partialData.pending_qty} once stock is refilled.`}
            </div>

            {/* Delivery breakdown for partial */}
            {partialData.order_type !== "PRE_ORDER" && (
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1, textAlign: "center", background: "#f0fdf4", borderRadius: 8, padding: "10px 8px", border: "1px solid #a7f3d0" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{partialData.available_qty}</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Deliver Now</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", fontSize: 16, color: "#94a3b8" }}>+</div>
                <div style={{ flex: 1, textAlign: "center", background: "#fff7ed", borderRadius: 8, padding: "10px 8px", border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#ea580c" }}>{partialData.pending_qty}</div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>After Restock</div>
                </div>
              </div>
            )}

            {/* Do you want to proceed? */}
            <p style={{ fontWeight: 700, color: "#334155", marginBottom: 10, fontSize: 14 }}>Do you want to proceed?</p>

            {/* Option 1: Proceed */}
            <button onClick={() => handlePartialConfirm("proceed")} style={{ width: "100%", marginBottom: 8, background: "linear-gradient(135deg,#1e40af,#3b82f6)", color: "#fff", border: "none", borderRadius: 10, padding: "13px", cursor: "pointer", fontWeight: 700, fontSize: 14, textAlign: "left" }}>
              <div style={{ fontWeight: 800, marginBottom: 2 }}>
                {partialData.order_type === "PRE_ORDER" ? "✅ Proceed with Pre-Order" : "✅ Proceed with Partial Delivery"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {partialData.order_type === "PRE_ORDER"
                  ? `Reserve all ${partialData.requested_qty} cylinders — delivered as stock arrives`
                  : `Deliver ${partialData.available_qty} now + reserve ${partialData.pending_qty} for later`}
              </div>
            </button>

            {/* Option 2: Change order quantity */}
            <button onClick={() => handlePartialConfirm("change_qty")} style={{ width: "100%", marginBottom: 8, background: "#f8fafc", color: "#0f172a", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "13px", cursor: "pointer", fontWeight: 700, fontSize: 14, textAlign: "left" }}>
              <div style={{ fontWeight: 800, marginBottom: 2 }}>✏️ Change Order Quantity</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {partialData.order_type === "PRE_ORDER"
                  ? "Go back and adjust your order"
                  : `Order only ${partialData.available_qty} cylinders (available now)`}
              </div>
            </button>

            {/* Option 3: Cancel */}
            <button onClick={() => handlePartialConfirm("cancel")} style={{ width: "100%", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 13, padding: "6px 0" }}>
              Cancel — go back to form
            </button>
          </div>
        </div>
      )}

      {step === "payment" && (
        <form onSubmit={handleFinalSubmit} style={{ marginTop:8 }}>
          {/* Order summary */}
          <div style={{ background:"linear-gradient(135deg,#f0fdf4,#d1fae5)", border:"1.5px solid #a7f3d0", borderRadius:12, padding:"18px 20px", marginBottom:22 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#065f46", textTransform:"uppercase", letterSpacing:0.8, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              ✅ Order Confirmed
            </div>
            <div style={{ fontSize:13, color:"#0f172a", lineHeight:2 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#475569" }}>Warehouse</span>
                <strong>{effectiveWarehouse?.name ?? "—"}</strong>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#475569" }}>Order Type</span>
                <span style={{ fontWeight:600 }}>{orderDecision === "oos" ? "⏳ Pre-Order" : orderDecision === "partial" ? "📦 Partial Delivery" : "🚚 Normal Delivery"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#475569" }}>Cylinders</span>
                <strong>{orderDecision === "partial" ? `${partialForm?._available_qty} now + ${partialForm?._pending_qty} reserved` : orderDecision === "oos" ? `${partialForm?.total_quantity} reserved` : partialForm?.total_quantity}</strong>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px solid #a7f3d0", paddingTop:8, marginTop:4 }}>
                <span style={{ color:"#065f46", fontWeight:700 }}>Total to Pay</span>
                <strong style={{ fontSize:16 }}>LKR {grandTotal.toLocaleString("en-LK", { minimumFractionDigits:2 })}</strong>
              </div>
            </div>
          </div>

          {/* Receipt upload */}
          <div style={{ marginBottom:22 }}>
            <label style={{ display:"block", fontWeight:700, marginBottom:6, color:"#0f172a", fontSize:14 }}>
              Upload Payment Receipt <span style={{ color:"#dc2626" }}>*</span>
            </label>
            <p style={{ fontSize:12, color:"#64748b", marginBottom:10, lineHeight:1.6 }}>
              Upload your bank slip or payment screenshot (JPG, PNG, PDF — max 4 MB).
              {deliveryFee > 0 && <strong style={{ color:"#1e40af" }}> Make sure to include the delivery fee of LKR {deliveryFee.toLocaleString()} in your payment.</strong>}
            </p>
            <label style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"14px 18px", borderRadius:10,
              border:"2px dashed #bfdbfe", background:"#f8faff",
              cursor:"pointer", transition:"all .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor="#3b82f6"}
            onMouseLeave={e => e.currentTarget.style.borderColor="#bfdbfe"}>
              <span style={{ fontSize:22 }}>📎</span>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:"#1e40af" }}>
                  {receipt ? `✅ ${receipt.name}` : "Click to upload receipt"}
                </div>
                <div style={{ fontSize:11, color:"#94a3b8" }}>JPG · PNG · PDF · max 4 MB</div>
              </div>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} style={{ display:"none" }} />
            </label>
          </div>

          {submitMsg && (
            <div style={{ padding:"12px 16px", borderRadius:9, marginBottom:16, background:"#fef2f2", color:"#dc2626", fontWeight:600, fontSize:13, border:"1px solid #fecaca" }}>
              ⚠️ {submitMsg.replace("Error: ", "")}
            </div>
          )}

          <div style={{ display:"flex", gap:12 }}>
            <button type="button" onClick={() => { setStep("order"); setSubmitMsg(""); setReceipt(null); }} style={{ background:"#f1f5f9", color:"#475569", border:"1.5px solid #e2e8f0", borderRadius:9, padding:"12px 20px", cursor:"pointer", fontWeight:600, fontSize:14 }}>
              ← Back
            </button>
            <button type="submit" className="client-action-btn" style={{ flex:1, marginTop:0 }} disabled={submitting || !receipt}>
              {submitting ? "Placing Order…" : "✅ Confirm & Place Order"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default GasBookingTab;
