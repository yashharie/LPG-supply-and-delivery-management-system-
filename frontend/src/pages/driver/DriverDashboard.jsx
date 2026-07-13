import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import {
  FaBoxes, FaTruck, FaCheckCircle, FaWarehouse,
  FaMapMarkerAlt, FaPhoneAlt, FaUser, FaPlus, FaArrowLeft,
  FaPlay, FaStop, FaSatelliteDish, FaClipboardList, FaSync,
} from "react-icons/fa";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Swal from "sweetalert2";
import { confirmDialog, toast, errorAlert } from "../../utils/swal";
import "../../styles/DriverDashboard.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const API = "http://127.0.0.1:8000/api";

/* â”€â”€ Map helpers â”€â”€ */
function MapRecenter({ pos }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView(pos, map.getZoom(), { animate: true }); }, [pos]);
  return null;
}

function RouteLayer({ from, to }) {
  const [route, setRoute] = useState(null);
  const map = useMap();
  useEffect(() => {
    if (!from || !to) return;
    fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(d => {
        if (d.routes?.[0]) {
          const coords = d.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          setRoute(coords);
          if (coords.length > 0) map.fitBounds(L.latLngBounds(coords), { padding: [20, 20] });
        }
      }).catch(() => {});
  }, [from, to]);
  return route ? <Polyline positions={route} color="#1e40af" weight={4} opacity={0.85} dashArray="8 4" /> : null;
}

const warehouseIcon = L.divIcon({
  className: "",
  html: `<div style="background:#1e40af;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);">ðŸ­</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});

const clientIcon = L.divIcon({
  className: "",
  html: `<div style="background:#dc2626;color:#fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);">ðŸ </div>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});

const DriverDashboard = () => {
  const [data,           setData]           = useState(null);
  const [trips,          setTrips]          = useState([]);
  const [availOrders,    setAvailOrders]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [view,           setView]           = useState("dashboard");
  const [selectedOrders, setSelectedOrders] = useState({});
  const [tripNotes,      setTripNotes]      = useState("");
  const [creatingTrip,   setCreatingTrip]   = useState(false);
  const [gpsStatus,      setGpsStatus]      = useState("idle");
  const [gpsMsg,         setGpsMsg]         = useState("");
  const [currentPos,     setCurrentPos]     = useState(null);
  const [expandedId,     setExpandedId]     = useState(null);
  const [activeSection,  setActiveSection]  = useState("trip"); // trip | pending | history
  const [loadingInputs,  setLoadingInputs]  = useState({});
  const [expandedDetailsId, setExpandedDetailsId] = useState(null);

  const getCylinderTypesForTrip = (trip) => {
    const types = {};
    trip.orders?.forEach(o => {
      const isPartial = o.order_type === "PARTIAL_PENDING";
      const batchItems = isPartial && o.batch_items 
        ? (typeof o.batch_items === "string" ? JSON.parse(o.batch_items) : o.batch_items)
        : null;

      if (batchItems && batchItems.length > 0) {
        batchItems.forEach(bi => {
          const ctId = bi.cylinder_type_id;
          const origItems = typeof o.items_summary === "string" ? JSON.parse(o.items_summary) : (o.items_summary ?? []);
          const origItem = origItems.find(x => Number(x.cylinder_type_id) === Number(ctId)) ?? {};
          const name = origItem.name || `${origItem.brand ?? "Cylinder"} ${origItem.kgWeight || origItem.weight || ""}kg`;
          types[ctId] = {
            cylinder_type_id: ctId,
            name: name,
            requested: (types[ctId]?.requested ?? 0) + Number(bi.quantity)
          };
        });
      } else {
        const items = typeof o.items_summary === "string" ? JSON.parse(o.items_summary) : (o.items_summary ?? []);
        items.forEach(i => {
          const name = i.name || `${i.brand} ${i.kgWeight || i.weight || ""}kg`;
          types[i.cylinder_type_id] = {
            cylinder_type_id: i.cylinder_type_id,
            name: name,
            requested: (types[i.cylinder_type_id]?.requested ?? 0) + Number(i.quantity)
          };
        });
      }
    });
    return Object.values(types);
  };

  const tokenRef = useRef(localStorage.getItem("token"));
  const watchId  = useRef(null);

  const postLocation = useCallback((lat, lng) => {
    axios.post(`${API}/driver/location`, { lat, lng },
      { headers: { Authorization: `Bearer ${tokenRef.current}` } }).catch(() => {});
  }, []);

  const startSharing = useCallback(() => {
    setGpsMsg("");
    if (!navigator.geolocation) { setGpsStatus("denied"); setGpsMsg("Geolocation not supported."); return; }
    if (watchId.current !== null) return;
    setGpsStatus("sharing");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => { const { latitude: lat, longitude: lng } = pos.coords; setCurrentPos([lat, lng]); setGpsStatus("sharing"); postLocation(lat, lng); },
      (err)  => { setGpsStatus("denied"); setGpsMsg({1:"Permission denied.",2:"GPS unavailable.",3:"Timed out."}[err.code]??"Error."); watchId.current = null; },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [postLocation]);

  const stopSharing = useCallback(() => {
    if (watchId.current !== null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
    setGpsStatus("idle"); setCurrentPos(null); setGpsMsg("");
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/driver/dashboard`,       { headers: { Authorization: `Bearer ${tokenRef.current}` } }),
      axios.get(`${API}/driver/trips/current`,   { headers: { Authorization: `Bearer ${tokenRef.current}` } }),
      axios.get(`${API}/driver/available-orders`,{ headers: { Authorization: `Bearer ${tokenRef.current}` } }),
    ]).then(([r1, r2, r3]) => {
      setData(r1.data);
      setTrips(r2.data.trips ?? []);
      setAvailOrders(r3.data ?? []);
      const hasActive = (r2.data.trips ?? []).some(t => t.status === "active");
      if (hasActive) startSharing(); else stopSharing();
    }).catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [startSharing, stopSharing]);

  useEffect(() => {
    fetchData();
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [fetchData]);

  useEffect(() => {
    const s = {};
    availOrders.forEach(o => {
      const bq = o.remaining_quantity > 0 ? o.remaining_quantity : (o.total_quantity - o.delivered_quantity);
      s[o.id] = { checked: false, qty: bq, max: bq };
    });
    setSelectedOrders(s);
  }, [availOrders]);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    const payload = Object.keys(selectedOrders).filter(id => selectedOrders[id].checked)
      .map(id => ({ order_id: parseInt(id), accepted_quantity: selectedOrders[id].qty }));
    if (!payload.length) { errorAlert("Select at least one order."); return; }
    setCreatingTrip(true);
    try {
      await axios.post(`${API}/driver/trips`, { orders: payload, notes: tripNotes },
        { headers: { Authorization: `Bearer ${tokenRef.current}` } });
      toast("Trip prepared!"); setTripNotes(""); setView("dashboard"); fetchData();
    } catch (err) { errorAlert("Error", err.response?.data?.message || "Failed."); }
    finally { setCreatingTrip(false); }
  };

  const handleSaveLoading = async (tripId, cylinderTypesInTrip) => {
    const items = cylinderTypesInTrip.map(ct => {
      const val = loadingInputs[`${tripId}_${ct.cylinder_type_id}`] ?? ct.requested;
      return {
        cylinder_type_id: ct.cylinder_type_id,
        quantity: Number(val)
      };
    });

    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      for (const item of items) {
        const stockObj = trip.warehouse?.stocks?.find(s => Number(s.cylinder_type_id) === Number(item.cylinder_type_id));
        const warehouseStock = stockObj ? Number(stockObj.quantity) : 0;
        if (item.quantity > warehouseStock) {
          const ctName = cylinderTypesInTrip.find(ct => ct.cylinder_type_id === item.cylinder_type_id)?.name ?? "Cylinder";
          errorAlert("Error", `Cannot load ${item.quantity} of ${ctName}. Only ${warehouseStock} available in warehouse stock.`);
          return;
        }
      }
    }

    try {
      await axios.post(`${API}/driver/trips/${tripId}/load`, { loaded_items: items }, {
        headers: { Authorization: `Bearer ${tokenRef.current}` }
      });
      toast("Loading quantities saved successfully!");
      fetchData();
    } catch (err) {
      errorAlert("Error", err.response?.data?.message || "Failed to save loaded quantities.");
    }
  };

  const handleStartTrip = async (tripId) => {
    const pendingTrip = trips.find(t => t.id === tripId);
    if (!pendingTrip) return;

    if (!pendingTrip.loaded_items || pendingTrip.loaded_items.length === 0) {
      errorAlert("Please save loaded quantities first.");
      return;
    }

    const totalCyl = pendingTrip.loaded_items.reduce((s, x) => s + (x.quantity ?? 0), 0);

    const ok = await Swal.fire({
      title: "Depart Trip?",
      text: `Start trip #${tripId} with ${totalCyl} loaded cylinders. Truck GPS tracking will be activated.`,
      icon: "question",
      confirmButtonText: "✅ Start Trip",
      confirmButtonColor: "#1e40af",
      showCancelButton: true,
      cancelButtonText: "Not Yet",
      cancelButtonColor: "#64748b",
    });

    if (!ok.isConfirmed) return;

    try {
      await axios.post(`${API}/driver/trips/${tripId}/start`, {}, {
        headers: { Authorization: `Bearer ${tokenRef.current}` }
      });
      toast(`Trip started! GPS is active.`);
      fetchData();
      startSharing();
    } catch (err) {
      errorAlert("Failed", err.response?.data?.message || "Could not start trip.");
    }
  };

  const handleRecordDelivery = async (tripId, orderId, orderNumber, remaining) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;
    const order = trip.orders?.find(o => o.id === orderId);
    if (!order) return;

    const orderItems = typeof order.items_summary === "string"
      ? JSON.parse(order.items_summary)
      : (order.items_summary ?? []);

    const loadedItems = trip.loaded_items ?? [];

    const deliveredInOthers = {};
    trip.tripOrders?.forEach(to => {
      if (to.order_id !== order.id) {
        to.delivered_items?.forEach(item => {
          deliveredInOthers[item.cylinder_type_id] = (deliveredInOthers[item.cylinder_type_id] ?? 0) + item.quantity;
        });
      }
    });

    const selfDelivered = {};
    const pivotOrder = trip.tripOrders?.find(to => to.order_id === order.id);
    pivotOrder?.delivered_items?.forEach(item => {
      selfDelivered[item.cylinder_type_id] = item.quantity;
    });

    const itemsToDeliver = orderItems.map(item => {
      const typeId = item.cylinder_type_id;
      const loadedQty = loadedItems.find(li => li.cylinder_type_id === typeId)?.quantity ?? 0;
      const otherDeliv = deliveredInOthers[typeId] ?? 0;
      const selfDeliv  = selfDelivered[typeId] ?? 0;
      
      const maxOnTruck = Math.max(0, loadedQty - otherDeliv - selfDeliv);
      const orderedNeeded = Math.max(0, item.quantity - (item.delivered_qty ?? 0));
      
      return {
        ...item,
        maxOnTruck,
        orderedNeeded,
        maxDeliverable: Math.min(maxOnTruck, orderedNeeded)
      };
    }).filter(x => x.maxDeliverable > 0);

    if (itemsToDeliver.length === 0) {
      errorAlert("No cylinders left to deliver on truck for this order.");
      return;
    }

    const tableHtml = `
      <div style="font-family: inherit; text-align: left; padding: 4px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
          <thead>
            <tr style="border-bottom: 2px solid #cbd5e1; background: #f1f5f9; text-align: left;">
              <th style="padding: 8px; color: #475569; font-weight: 700;">Cylinder Type</th>
              <th style="padding: 8px; color: #475569; font-weight: 700; text-align: right;">Ordered</th>
              <th style="padding: 8px; color: #475569; font-weight: 700; text-align: right;">Loaded</th>
              <th style="padding: 8px; color: #475569; font-weight: 700; text-align: right; width: 80px;">Delivered</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToDeliver.map(item => {
              const name = item.name || `${item.brand} ${item.kgWeight || item.weight}kg`;
              return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px; color: #334155; font-weight: 500;">${name}</td>
                  <td style="padding: 8px; color: #334155; text-align: right;">${item.quantity}</td>
                  <td style="padding: 8px; color: #334155; text-align: right;">${item.maxOnTruck}</td>
                  <td style="padding: 8px; text-align: right;">
                    <input type="number" id="deliv_qty_${item.cylinder_type_id}" class="swal2-input" 
                      style="width: 70px; height: 32px; margin: 0; padding: 4px; font-size: 13px; text-align: right; box-sizing: border-box;" 
                      min="0" max="${item.maxDeliverable}" value="${item.maxDeliverable}">
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5; margin-bottom: 8px;">
          Remaining in Truck (Live Calculation)
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid #cbd5e1; background: #f1f5f9; text-align: left;">
              <th style="padding: 8px; color: #475569; font-weight: 700;">Cylinder Type</th>
              <th style="padding: 8px; color: #475569; font-weight: 700; text-align: right;">Remaining in Truck</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToDeliver.map(item => {
              const name = item.name || `${item.brand} ${item.kgWeight || item.weight}kg`;
              const initialRemaining = Math.max(0, item.maxOnTruck - item.maxDeliverable);
              return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px; color: #334155;">${name}</td>
                  <td id="rem_qty_${item.cylinder_type_id}" style="padding: 8px; color: #1e40af; text-align: right; font-weight: 600;">
                    ${initialRemaining}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    const qtyResult = await Swal.fire({
      title: `Deliver Cylinders — #${orderNumber}`,
      html: `
        <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
          ${tableHtml}
        </div>
      `,
      confirmButtonText: "Generate Delivery OTP →",
      confirmButtonColor: "#10b981",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      didOpen: () => {
        const updateRemaining = () => {
          itemsToDeliver.forEach(item => {
            const inputEl = document.getElementById(`deliv_qty_${item.cylinder_type_id}`);
            const remEl = document.getElementById(`rem_qty_${item.cylinder_type_id}`);
            if (inputEl && remEl) {
              const val = parseInt(inputEl.value) || 0;
              const remaining = Math.max(0, item.maxOnTruck - val);
              remEl.innerText = remaining;
            }
          });
        };
        itemsToDeliver.forEach(item => {
          const inputEl = document.getElementById(`deliv_qty_${item.cylinder_type_id}`);
          if (inputEl) {
            inputEl.addEventListener('input', updateRemaining);
          }
        });
      },
      preConfirm: () => {
        const delivItems = [];
        for (const item of itemsToDeliver) {
          const el = document.getElementById(`deliv_qty_${item.cylinder_type_id}`);
          if (el) {
            const val = parseInt(el.value) || 0;
            if (val < 0) {
              Swal.showValidationMessage("Delivered quantity cannot be negative.");
              return false;
            }
            if (val > item.maxDeliverable) {
              Swal.showValidationMessage(`Quantity for ${item.name || "Cylinder"} cannot exceed ${item.maxDeliverable}.`);
              return false;
            }
            delivItems.push({ cylinder_type_id: item.cylinder_type_id, quantity: val });
          }
        }
        return delivItems;
      }
    });

    if (!qtyResult.isConfirmed || !qtyResult.value) return;
    const finalDelivItems = qtyResult.value;

    let otpDev = null;
    let totalQtyDelivered = finalDelivItems.reduce((s, x) => s + x.quantity, 0);

    // If no cylinders are being delivered, bypass OTP generation entirely
    if (totalQtyDelivered === 0) {
      try {
        await axios.post(
          `${API}/driver/trips/${tripId}/deliver/${orderId}`,
          { delivered_items: finalDelivItems },
          { headers: { Authorization: `Bearer ${tokenRef.current}` } }
        );
        toast(`Recorded delivery attempt (0 cylinders delivered).`);
        fetchData();
      } catch (err) {
        errorAlert("Error", err.response?.data?.message || "Could not record delivery.");
      }
      return;
    }

    // 1. Generate OTP
    try {
      const otpRes = await axios.post(
        `${API}/driver/trips/${tripId}/deliver/${orderId}/otp-generate`,
        { delivered_items: finalDelivItems },
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );
      otpDev = otpRes.data.otp_dev;
      toast("OTP sent to customer!");
    } catch (err) {
      errorAlert("Error", err.response?.data?.message || "Could not generate OTP.");
      return;
    }

    // 2. Display OTP verify modal
    const otpVerifyResult = await Swal.fire({
      title: "Enter Customer OTP",
      html: `
        <p style="font-size: 13px; color: #475569; margin-bottom: 12px;">
          Ask the customer for the 6-digit OTP sent to their email/app to verify delivery of <strong>${totalQtyDelivered} cylinders</strong>.
        </p>
        <input type="text" id="delivery_otp_input" class="swal2-input" placeholder="Enter 6-digit OTP" 
          maxLength="6" style="text-align: center; letter-spacing: 4px; font-weight: bold; font-size: 18px; width: 80%; margin: 0 auto;">
      `,
      showCancelButton: true,
      confirmButtonText: "Verify & Complete Delivery",
      confirmButtonColor: "#10b981",
      preConfirm: () => {
        const otp = document.getElementById("delivery_otp_input").value;
        if (!otp || otp.length !== 6) {
          Swal.showValidationMessage("Please enter the 6-digit OTP.");
          return false;
        }
        return otp;
      }
    });

    if (!otpVerifyResult.isConfirmed) return;
    const enteredOtp = otpVerifyResult.value;

    // 3. Verify OTP
    try {
      await axios.post(
        `${API}/driver/trips/${tripId}/deliver/${orderId}/otp-verify`,
        { otp: enteredOtp },
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );
      toast(`✅ Delivery verified successfully!`);
      fetchData();
    } catch (err) {
      errorAlert("Verification Failed", err.response?.data?.message || "Incorrect or expired OTP.");
    }
  };

  const handleEndTrip = async (tripId) => {
    const activeTrip = trips.find(t => t.id === tripId);
    if (!activeTrip) return;

    const tripOrders = activeTrip.tripOrders ?? [];
    const loadedItems = activeTrip.loaded_items ?? [];

    const deliveryInputs = [];
    const currentDeliveredInTrip = {};

    // Initialize with existing deliveries
    tripOrders.forEach(to => {
      currentDeliveredInTrip[to.order_id] = {};
      to.delivered_items?.forEach(item => {
        currentDeliveredInTrip[to.order_id][item.cylinder_type_id] = item.quantity;
      });
    });

    for (const to of tripOrders) {
      const order = activeTrip.orders?.find(o => o.id === to.order_id);
      if (!order) continue;

      const orderItems = typeof order.items_summary === "string"
        ? JSON.parse(order.items_summary)
        : (order.items_summary ?? []);

      const itemsToDeliver = orderItems.map(item => {
        const typeId = item.cylinder_type_id;
        const loadedQty = loadedItems.find(li => li.cylinder_type_id === typeId)?.quantity ?? 0;
        
        let otherDeliv = 0;
        tripOrders.forEach(otherTo => {
          if (otherTo.order_id !== order.id) {
            otherDeliv += (currentDeliveredInTrip[otherTo.order_id]?.[typeId] ?? 0);
          }
        });

        const selfDeliv = currentDeliveredInTrip[order.id]?.[typeId] ?? 0;

        const maxOnTruck = Math.max(0, loadedQty - otherDeliv - selfDeliv);
        const orderedNeeded = Math.max(0, item.quantity - (item.delivered_qty ?? 0));

        return {
          ...item,
          maxOnTruck,
          orderedNeeded,
          maxDeliverable: Math.min(maxOnTruck, orderedNeeded)
        };
      }).filter(x => x.maxDeliverable > 0);

      if (itemsToDeliver.length === 0) continue;

      const inputHtml = itemsToDeliver.map(item => {
        const name = item.name || `${item.brand} ${item.kgWeight || item.weight + "kg"}`;
        return `
          <div style="margin-bottom: 14px; text-align: left; font-family: inherit;">
            <label style="font-size: 13px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">
              ${name} <br/>
              <span style="font-size: 11px; font-weight: normal; color: #94a3b8;">
                Remaining Ordered: ${item.orderedNeeded} · Remaining on Truck: ${item.maxOnTruck}
              </span>
            </label>
            <input type="number" id="final_deliv_qty_${item.cylinder_type_id}" class="swal2-input" 
              style="width: 100%; box-sizing: border-box; margin: 4px 0 0 0; height: 38px; font-size: 14px;" 
              min="0" max="${item.maxDeliverable}" value="0">
          </div>
        `;
      }).join("");

      const qtyResult = await Swal.fire({
        title: `Final Delivery — Order #${order.order_number}`,
        html: `
          <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
            Did you deliver any of the remaining cylinders to <strong>${order.user?.name ?? "Client"}</strong>? <br/>
            Enter the quantities delivered (if any) or leave as 0.
          </p>
          <div style="max-height: 45vh; overflow-y: auto; padding: 4px;">
            ${inputHtml}
          </div>
        `,
        confirmButtonText: "Confirm",
        confirmButtonColor: "#1e40af",
        showCancelButton: false,
        allowOutsideClick: false,
        preConfirm: () => {
          const delivItems = [];
          for (const item of itemsToDeliver) {
            const el = document.getElementById(`final_deliv_qty_${item.cylinder_type_id}`);
            if (el) {
              const val = parseInt(el.value) || 0;
              if (val < 0) {
                Swal.showValidationMessage("Delivered quantity cannot be negative.");
                return false;
              }
              if (val > item.maxDeliverable) {
                Swal.showValidationMessage(`Quantity for ${item.name || "Cylinder"} cannot exceed ${item.maxDeliverable}.`);
                return false;
              }
              if (val > 0) {
                delivItems.push({ cylinder_type_id: item.cylinder_type_id, quantity: val });
              }
            }
          }
          return delivItems;
        }
      });

      if (!qtyResult.isConfirmed) return;

      const finalDelivItems = qtyResult.value ?? [];
      if (finalDelivItems.length > 0) {
        deliveryInputs.push({
          order_id: order.id,
          delivered_items: finalDelivItems
        });

        finalDelivItems.forEach(item => {
          currentDeliveredInTrip[order.id][item.cylinder_type_id] = 
            (currentDeliveredInTrip[order.id][item.cylinder_type_id] ?? 0) + item.quantity;
        });
      }
    }

    const ok = await Swal.fire({
      title: "End Trip & Return to Warehouse",
      text: "Are you sure you want to end this trip? Any undelivered cylinders loaded on the truck will be automatically returned to the warehouse inventory and logged in Stock History.",
      icon: "warning",
      confirmButtonText: "🏁 End Trip Now",
      confirmButtonColor: "#dc2626",
      showCancelButton: true,
      cancelButtonText: "Cancel",
    });

    if (!ok.isConfirmed) return;

    try {
      await axios.post(`${API}/driver/trips/${tripId}/end`, { delivery_inputs: deliveryInputs }, {
        headers: { Authorization: `Bearer ${tokenRef.current}` }
      });
      toast("Trip ended. Stock return logged.");
      stopSharing();
      fetchData();
    } catch (err) {
      errorAlert("Error", err.response?.data?.message || "Could not end trip.");
    }
  };

  if (loading) return (
    <div className="drv-loading">
      <div className="drv-loading-spin" />
      Loading...
    </div>
  );
  if (error) return <div style={{ padding:40, color:"#ef4444" }}>{error}</div>;

  const { driver, completed = [], stats } = data;
  const activeTrip   = trips.find(t => t.status === "active");
  const pendingTrips = trips.filter(t => t.status === "pending");

  /* â”€â”€ GPS banner config â”€â”€ */
  const gpsCfg = {
    idle:    { bg:"#f0f4fa", border:"#e0e7ff", dot:"#94a3b8", text:"#475569", label:"GPS Idle - starts automatically on active trip" },
    sharing: { bg:"#f0fdf4", border:"#bbf7d0", dot:"#10b981", text:"#065f46", label:"GPS Live Tracking Active" },
    denied:  { bg:"#fef2f2", border:"#fecaca", dot:"#ef4444", text:"#991b1b", label:"GPS Blocked" },
  }[gpsStatus] ?? { bg:"#f0f4fa", border:"#e0e7ff", dot:"#94a3b8", text:"#475569", label:"GPS Idle" };

  /* â”€â”€ PREPARE TRIP VIEW â”€â”€ */
  if (view === "create-trip") return (
    <div className="drv-prepare-page">
      <div className="drv-prepare-header">
        <div>
          <h2 className="drv-prepare-title">Prepare Delivery Trip</h2>
          <p className="drv-prepare-sub">Select assigned orders and confirm loading quantities.</p>
        </div>
        <button onClick={() => setView("dashboard")} className="drv-btn-back">
          <FaArrowLeft style={{ fontSize:11 }} /> Back
        </button>
      </div>

      {availOrders.length === 0 ? (
        <div className="drv-empty-orders">
          <div className="drv-empty-orders-icon">📋</div>
          <div className="drv-empty-orders-title">No Assigned Orders</div>
          <div className="drv-empty-orders-sub">The warehouse manager hasn't assigned any orders to you yet.</div>
        </div>
      ) : (
        <form onSubmit={handleCreateTrip}>
          <div className="drv-prepare-grid">
            {/* Order list */}
            <div className="drv-order-list">
              <div className="drv-order-list-header">
                Assigned Orders ({availOrders.length})
              </div>
              {availOrders.map((o) => {
                const s = selectedOrders[o.id] || { checked: false, qty: 1, max: 1 };
                return (
                  <div key={o.id}
                    onClick={() => setSelectedOrders(p => ({...p,[o.id]:{...p[o.id],checked:!p[o.id].checked}}))}
                    className={`drv-order-select-item${s.checked ? " checked" : ""}`}>
                    <div className="drv-order-select-inner">
                      <div className={`drv-checkbox${s.checked ? " checked" : " unchecked"}`}>
                        {s.checked && "✓"}
                      </div>
                      <div className="drv-select-info">
                        <div>
                          <span className="drv-select-num">#{o.order_number}</span>
                          <span className="drv-select-status">{o.status}</span>
                        </div>
                        <div className="drv-select-meta">
                          <span style={{ display:"flex",alignItems:"center",gap:4 }}><FaUser style={{ fontSize:10 }} />{o.user?.name ?? "—"}</span>
                          <span style={{ display:"flex",alignItems:"center",gap:4 }}><FaMapMarkerAlt style={{ fontSize:10 }} />{o.user?.address ?? "—"}</span>
                        </div>
                      </div>
                      <div onClick={e => e.stopPropagation()} className="drv-qty-wrap">
                        <span className="drv-qty-label">Load:</span>
                        <input type="number" min={1} max={s.max} value={s.qty}
                          onChange={e => { const v=Math.max(1,Math.min(s.max,parseInt(e.target.value)||1)); setSelectedOrders(p=>({...p,[o.id]:{...p[o.id],qty:v}})); }}
                          disabled={!s.checked}
                          className="drv-qty-input"
                          style={{ opacity: s.checked?1:0.5 }} />
                        <span className="drv-qty-max">/ {s.max}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary + submit */}
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div className="drv-summary-card">
                <div className="drv-summary-title">Trip Summary</div>
                {(() => {
                  const checked = Object.values(selectedOrders).filter(s => s.checked);
                  const totalCyl = checked.reduce((s, o) => s + o.qty, 0);
                  return (
                    <>
                      <div className="drv-summary-row">
                        <span className="drv-summary-row-label">Orders selected</span>
                        <strong style={{ color:"#0f172a" }}>{checked.length}</strong>
                      </div>
                      <div className="drv-summary-row">
                        <span className="drv-summary-row-label">Total cylinders</span>
                        <strong style={{ color:"#1e40af",fontSize:16 }}>{totalCyl}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="drv-notes-card">
                <label className="drv-notes-label">Trip Notes (Optional)</label>
                <textarea value={tripNotes} onChange={e => setTripNotes(e.target.value)}
                  placeholder="e.g. Morning run, handle with careâ€¦"
                  rows={3} className="drv-notes-textarea" />
              </div>

              <button type="submit" disabled={creatingTrip} className="drv-btn-save-trip">
                {creatingTrip ? "Preparingâ€¦" : <><FaClipboardList style={{ fontSize:13 }} /> Save & Prepare Trip</>}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );

  /* â”€â”€ MAIN DASHBOARD â”€â”€ */
  return (
    <div className="drv-page">
      {/* PAGE HEADER */}
      <div className="drv-header">
        <div className="drv-header-left">
          <div className="drv-header-sub">Delivery Driver</div>
          <h1 className="drv-header-name">{driver.name}</h1>
          {driver.warehouse && (
            <div className="drv-header-wh">
              <FaWarehouse style={{ fontSize:11,color:"#94a3b8" }} /> {driver.warehouse.name}
            </div>
          )}
        </div>

        <div className="drv-header-right">
          <div className="drv-gps-banner" style={{ background:gpsCfg.bg, borderColor:gpsCfg.border }}>
            <div className={`drv-gps-dot${gpsStatus==="sharing"?" sharing":""}`} style={{ background:gpsCfg.dot }} />
            <span className="drv-gps-label" style={{ color:gpsCfg.text }}>{gpsCfg.label}</span>
            {gpsStatus==="sharing" && currentPos && (
              <span className="drv-gps-coords">{currentPos[0].toFixed(4)}, {currentPos[1].toFixed(4)}</span>
            )}
          </div>
          <button onClick={fetchData} className="drv-btn-refresh">
            <FaSync style={{ fontSize:11 }} />
          </button>
          {gpsStatus !== "sharing" ? (
            <button onClick={startSharing} className="drv-btn-gps-start">
              <FaSatelliteDish style={{ fontSize:12 }} /> Start GPS
            </button>
          ) : (
            <button onClick={stopSharing} className="drv-btn-gps-stop">
              <FaStop style={{ fontSize:11 }} /> Stop GPS
            </button>
          )}
          <button onClick={() => setView("create-trip")} className="drv-btn-new-trip">
            <FaPlus style={{ fontSize:11 }} /> New Trip
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="drv-kpi-strip">
        {[
          { label:"Total Deliveries", value:stats.total_deliveries,     accent:"#3b82f6", icon:"📦", action:() => setActiveSection("history") },
          { label:"Active Now",       value:stats.active_deliveries,    accent:"#f59e0b", icon:"🚚", action:() => document.getElementById("active-trip-section")?.scrollIntoView({ behavior:"smooth" }) },
          { label:"Completed",        value:stats.completed_deliveries, accent:"#10b981", icon:"✅", action:() => setActiveSection("history") },
        ].map(s => (
          <div key={s.label} className="drv-kpi-card" style={{ borderTopColor:s.accent }} onClick={s.action}>
            <div>
              <div className="drv-kpi-label">{s.label}</div>
              <div className="drv-kpi-value">{s.value}</div>
            </div>
            <div className="drv-kpi-icon">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="drv-main-grid">

        {/* LEFT: Active Trip */}
        <div id="active-trip-section" className="drv-trip-panel">
          <div className={`drv-trip-header${activeTrip?" active":""}`}>
            <div className="drv-trip-header-left">
              <FaTruck style={{ color: activeTrip?"#93c5fd":"#94a3b8", fontSize:16 }} />
              <span className={`drv-trip-header-title${activeTrip?" active":" idle"}`}>
                {activeTrip ? `Active Trip #${activeTrip.id}` : "No Active Trip"}
              </span>
            </div>
            {activeTrip && (
              <div className="drv-trip-stats">
                <span>Loaded: <strong style={{ color:"#fff" }}>{activeTrip.tripOrders?.reduce((s,t)=>s+t.accepted_quantity,0) ?? activeTrip.total_loaded}</strong></span>
                <span>Delivered: <strong style={{ color:"#93c5fd" }}>{activeTrip.tripOrders?.reduce((s,t)=>s+t.delivered_quantity,0) ?? activeTrip.total_delivered}</strong></span>
              </div>
            )}
          </div>

          {!activeTrip ? (
            <div className="drv-trip-empty">
              <div className="drv-trip-empty-icon">🚚</div>
              <div className="drv-trip-empty-title">No Active Trip</div>
              <div className="drv-trip-empty-sub">Start a pending trip or prepare a new one.</div>
              <button onClick={() => setView("create-trip")} className="drv-btn-prepare">Prepare New Trip</button>
            </div>
          ) : (
            <div>
              {activeTrip.orders?.map((o) => {
                const isExp = expandedId === o.id;
                const pivot = o.pivot ?? activeTrip.tripOrders?.find(t => Number(t.order_id) === Number(o.id)) ?? { accepted_quantity:0, delivered_quantity:0 };
                const rem   = pivot.accepted_quantity - pivot.delivered_quantity;
                const pct   = pivot.accepted_quantity > 0 ? Math.round((pivot.delivered_quantity / pivot.accepted_quantity) * 100) : 0;
                const warehouseLat = activeTrip.warehouse?.latitude ? parseFloat(activeTrip.warehouse.latitude) : null;
                const warehouseLng = activeTrip.warehouse?.longitude ? parseFloat(activeTrip.warehouse.longitude) : null;
                const clientLat  = o.user?.latitude  ? parseFloat(o.user.latitude)  : null;
                const clientLng  = o.user?.longitude ? parseFloat(o.user.longitude) : null;

                return (
                  <div key={o.id} className="drv-order-card">
                    <div className="drv-order-body">
                      <div className="drv-order-top">
                        <div>
                          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                            <span className="drv-order-num">#{o.order_number}</span>
                            <span className={`drv-order-rem-badge${rem===0?" done":" pending"}`}>
                              {rem===0 ? "✓ Done" : `${rem} remaining`}
                            </span>
                          </div>
                          <div className="drv-order-meta">
                            <span style={{ display:"flex",alignItems:"center",gap:4 }}><FaUser style={{ fontSize:10 }} />{o.user?.name ?? "—"}</span>
                            <span style={{ display:"flex",alignItems:"center",gap:4 }}><FaPhoneAlt style={{ fontSize:10 }} />{o.user?.phone ?? "—"}</span>
                          </div>
                        </div>
                        <div className="drv-order-progress">
                          <div className="drv-order-progress-label">{pivot.delivered_quantity} / {pivot.accepted_quantity} cyl</div>
                          <div className="drv-progress-bar-bg">
                            <div className="drv-progress-bar-fill" style={{ width:`${pct}%`, background: pct===100?"#10b981":"#3b82f6" }} />
                          </div>
                          <div className="drv-progress-pct">{pct}%</div>
                        </div>
                      </div>

                      <div className="drv-order-address">
                        <FaMapMarkerAlt style={{ fontSize:10 }} />{o.user?.address ?? "—"}
                      </div>

                      {expandedDetailsId === o.id && (
                        <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, marginTop: 10, marginBottom: 10, border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Customer Name</span>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{o.user?.name ?? "—"}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Company Name</span>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{o.user?.company_name || "—"}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Contact Number</span>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{o.user?.phone ?? "—"}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Warehouse</span>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{activeTrip.warehouse?.name ?? "—"}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Order Number</span>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>#{o.order_number}</div>
                            </div>
                            <div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Delivery Status</span>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{o.status}</div>
                            </div>
                          </div>
                          
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                            Ordered Cylinders
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: "1.5px solid #cbd5e1", background: "#f1f5f9", textAlign: "left" }}>
                                <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 700 }}>Cylinder Type</th>
                                <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Ordered</th>
                                <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Delivered</th>
                                <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Remaining</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(typeof o.items_summary === "string" ? JSON.parse(o.items_summary) : (o.items_summary ?? [])).map((item, idx) => {
                                const name = item.name || `${item.brand} ${item.kgWeight || item.weight}kg`;
                                const ordered = Number(item.quantity || 0);
                                const delivered = Number(item.delivered_qty || 0);
                                const remaining = Math.max(0, ordered - delivered);
                                return (
                                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                    <td style={{ padding: "6px 8px", color: "#334155" }}>{name}</td>
                                    <td style={{ padding: "6px 8px", color: "#334155", textAlign: "right", fontWeight: "600" }}>{ordered}</td>
                                    <td style={{ padding: "6px 8px", color: "#10b981", textAlign: "right", fontWeight: "600" }}>{delivered}</td>
                                    <td style={{ padding: "6px 8px", color: remaining > 0 ? "#1e40af" : "#64748b", textAlign: "right", fontWeight: "600" }}>{remaining}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {rem > 0 && (
                        <button onClick={() => handleRecordDelivery(activeTrip.id, o.id, o.order_number, rem)}
                          className="drv-btn-deliver" style={{ marginRight: 8 }}>
                          🚚 Deliver Cylinders
                        </button>
                      )}

                      <button onClick={() => setExpandedDetailsId(expandedDetailsId === o.id ? null : o.id)} className="drv-btn-toggle-details" style={{ marginRight: 8 }}>
                        {expandedDetailsId === o.id ? "▲ Hide details" : "▼ Show details"}
                      </button>

                      <button onClick={() => setExpandedId(isExp ? null : o.id)} className="drv-btn-toggle-map">
                        {isExp ? "▲ Hide route map" : "▼ Show route map"}
                      </button>
                    </div>

                    {isExp && warehouseLat && clientLat && (
                      <div className="drv-route-map-wrap">
                        <div className="drv-route-map">
                          <MapContainer center={[warehouseLat, warehouseLng]} zoom={11} style={{ height:"100%",width:"100%" }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[warehouseLat, warehouseLng]} icon={warehouseIcon}><Popup>🏢 Warehouse</Popup></Marker>
                            <Marker position={[clientLat, clientLng]} icon={clientIcon}><Popup>🏠 {o.user?.name}</Popup></Marker>
                            <RouteLayer from={[warehouseLat, warehouseLng]} to={[clientLat, clientLng]} />
                            {currentPos && <Marker position={currentPos}><Popup>📍 You</Popup></Marker>}
                          </MapContainer>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {(() => {
                const allProcessed = activeTrip.orders?.every(o => {
                  const pivot = (o.pivot ?? activeTrip.tripOrders?.find(to => Number(to.order_id) === Number(o.id))) || {};
                  return pivot.status && pivot.status !== 'pending';
                });

                return (
                  <div className="drv-end-trip-bar" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", width: "100%" }}>
                    {!allProcessed && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e", textAlign: "center", fontWeight: 600 }}>
                        ⚠️ Please record delivery for all orders (click "Deliver Cylinders") before ending the trip.
                      </div>
                    )}
                    <button 
                      onClick={() => handleEndTrip(activeTrip.id)} 
                      disabled={!allProcessed}
                      className="drv-btn-end-trip"
                      style={{ 
                        opacity: allProcessed ? 1 : 0.5, 
                        cursor: allProcessed ? "pointer" : "not-allowed",
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <FaStop style={{ fontSize:12 }} /> End Trip & Return to Warehouse
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* RIGHT: sections */}
        <div className="drv-right-panel">
          <div className="drv-section-tabs">
            {[
              { key:"trip",    label:"Pending Trips",   count:pendingTrips.length },
              { key:"orders",  label:"Assigned Orders", count:availOrders.length  },
              { key:"history", label:"Completed",       count:completed.length    },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveSection(t.key)}
                className={`drv-section-tab${activeSection===t.key?" active":""}`}>
                {t.label}
                <span className="drv-section-badge" style={{
                  background: activeSection===t.key?"#bfdbfe":"#f1f5f9",
                  color:      activeSection===t.key?"#1e40af":"#94a3b8",
                }}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Pending trips */}
          {activeSection === "trip" && (
            <div className="drv-section-card">
              <div className="drv-section-card-header"><span className="drv-section-card-label">Ready to Start</span></div>
              {pendingTrips.length === 0 ? (
                <div className="drv-section-empty">No pending trips.</div>
              ) : pendingTrips.map(t => {
                const cargo = t.tripOrders?.reduce((s,x)=>s+x.accepted_quantity,0)
                  ?? t.orders?.reduce((s,o)=>s+(o.pivot?.accepted_quantity??o.total_quantity??0),0) ?? 0;
                const orderCount = t.tripOrders?.length ?? t.orders?.length ?? 0;
                const isLoaded = t.loaded_items && t.loaded_items.length > 0;
                const cylinderTypes = getCylinderTypesForTrip(t);
                return (
                  <div key={t.id} className="drv-pending-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 12 }}>
                    <div className="drv-pending-item-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div className="drv-pending-title">Trip #{t.id}</div>
                        <div className="drv-pending-sub">{cargo} cylinders · {orderCount} orders</div>
                        {t.notes && <div style={{ fontSize:11,color:"#94a3b8",marginTop:2 }}>{t.notes}</div>}
                      </div>
                      <span className="drv-pending-badge" style={{ 
                        background: isLoaded ? "#ecfdf5" : "#fef3c7", 
                        color: isLoaded ? "#065f46" : "#d97706",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        {isLoaded ? "Loaded" : "Not Loaded"}
                      </span>
                    </div>

                    {/* Cylinder Loading Inputs */}
                    <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Cylinder Loading Info
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 8 }}>
                        <thead>
                          <tr style={{ borderBottom: "1.5px solid #cbd5e1", background: "#f1f5f9", textAlign: "left" }}>
                            <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 700 }}>Cylinder Type</th>
                            <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Warehouse Stock</th>
                            <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Ordered</th>
                            <th style={{ padding: "6px 8px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Loaded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cylinderTypes.map(ct => {
                            const val = loadingInputs[`${t.id}_${ct.cylinder_type_id}`] ?? (isLoaded ? (t.loaded_items.find(li => li.cylinder_type_id === ct.cylinder_type_id)?.quantity ?? ct.requested) : ct.requested);
                            const stockObj = t.warehouse?.stocks?.find(s => Number(s.cylinder_type_id) === Number(ct.cylinder_type_id));
                            const warehouseStock = stockObj ? Number(stockObj.quantity) : 0;
                            return (
                              <tr key={ct.cylinder_type_id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={{ padding: "6px 8px", color: "#334155" }}>{ct.name}</td>
                                <td style={{ padding: "6px 8px", color: warehouseStock > 0 ? "#1e40af" : "#ef4444", textAlign: "right", fontWeight: "600" }}>{warehouseStock}</td>
                                <td style={{ padding: "6px 8px", color: "#334155", textAlign: "right", fontWeight: "600" }}>{ct.requested}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                  <input 
                                    type="number" 
                                    min={0} 
                                    max={warehouseStock}
                                    value={val} 
                                    disabled={isLoaded}
                                    onChange={e => {
                                      const v = Math.max(0, Math.min(warehouseStock, parseInt(e.target.value) || 0));
                                      setLoadingInputs(prev => ({ ...prev, [`${t.id}_${ct.cylinder_type_id}`]: v }));
                                    }}
                                    style={{ width: 60, padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 13, textAlign: "right" }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {!isLoaded && (
                        <button 
                          type="button" 
                          onClick={() => handleSaveLoading(t.id, cylinderTypes)}
                          style={{ 
                            marginTop: 8, 
                            width: "100%", 
                            padding: "8px 12px", 
                            background: "#3b82f6", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: 6, 
                            cursor: "pointer", 
                            fontSize: 13, 
                            fontWeight: 600 
                          }}
                        >
                          Save Loading Quantities
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={() => handleStartTrip(t.id)} 
                      disabled={!isLoaded}
                      className="drv-btn-start-trip"
                      style={{ 
                        opacity: isLoaded ? 1 : 0.5, 
                        cursor: isLoaded ? "pointer" : "not-allowed" 
                      }}
                    >
                      <FaPlay style={{ fontSize:10 }} /> Start This Trip
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available orders */}
          {activeSection === "orders" && (
            <div className="drv-section-card">
              <div className="drv-section-card-header"><span className="drv-section-card-label">Assigned to You</span></div>
              {availOrders.length === 0 ? (
                <div className="drv-section-empty">No orders assigned yet.</div>
              ) : availOrders.map(o => (
                <div key={o.id} className="drv-avail-item" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div>
                      <div className="drv-avail-num">#{o.order_number}</div>
                      <div className="drv-avail-sub">{o.user?.name} · {o.total_quantity} cyl</div>
                      <div className="drv-avail-address"><FaMapMarkerAlt style={{ fontSize:9 }} />{o.user?.address ?? "—"}</div>
                    </div>
                    <span className="drv-avail-badge">Approved</span>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => setExpandedDetailsId(expandedDetailsId === o.id ? null : o.id)} 
                    className="drv-btn-toggle-details" 
                    style={{ 
                      alignSelf: "flex-start", 
                      background: "transparent", 
                      border: "none", 
                      color: "#3b82f6", 
                      fontSize: "12px", 
                      fontWeight: "600", 
                      cursor: "pointer",
                      padding: "4px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    {expandedDetailsId === o.id ? "▲ Hide details" : "▼ Show details"}
                  </button>

                  {expandedDetailsId === o.id && (
                    <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", width: "100%", boxSizing: "border-box" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Customer Name</span>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{o.user?.name ?? "—"}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Company Name</span>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{o.user?.company_name || "—"}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Contact Number</span>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{o.user?.phone ?? "—"}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Delivery Status</span>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{o.status}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                        Ordered Cylinders
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ borderBottom: "1.5px solid #cbd5e1", background: "#f1f5f9", textAlign: "left" }}>
                            <th style={{ padding: "4px 6px", color: "#475569", fontWeight: 700 }}>Cylinder Type</th>
                            <th style={{ padding: "4px 6px", color: "#475569", fontWeight: 700, textAlign: "right" }}>Ordered</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(typeof o.items_summary === "string" ? JSON.parse(o.items_summary) : (o.items_summary ?? [])).map((item, idx) => {
                            const name = item.name || `${item.brand} ${item.kgWeight || item.weight}kg`;
                            return (
                              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={{ padding: "4px 6px", color: "#334155" }}>{name}</td>
                                <td style={{ padding: "4px 6px", color: "#334155", textAlign: "right", fontWeight: "600" }}>{item.quantity}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Completed */}
          {activeSection === "history" && (
            <div className="drv-section-card">
              <div className="drv-section-card-header"><span className="drv-section-card-label">Recent Deliveries</span></div>
              {completed.length === 0 ? (
                <div className="drv-section-empty">No deliveries yet.</div>
              ) : completed.slice(0,10).map(o => (
                <div key={o.id} className="drv-completed-item">
                  <div>
                    <div className="drv-completed-num">#{o.order_number}</div>
                    <div className="drv-completed-sub">{o.user?.name} · {o.total_quantity} cyl</div>
                  </div>
                  <span className="drv-completed-badge">✓ Delivered</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
