import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUsers, FaUser, FaTruck, FaWarehouse, FaBoxes,
  FaClock, FaCheckCircle, FaFileInvoice, FaSync,
  FaArrowUp, FaChartLine,
} from "react-icons/fa";
import DataTable from "../../components/DataTable";

const API     = "http://127.0.0.1:8000/api";
const STORAGE = "http://127.0.0.1:8000/storage/";

const STATUS = {
  "Pending":            { bg:"#fef9c3", c:"#92400e",  dot:"#f59e0b" },
  "Approved":           { bg:"#dbeafe", c:"#1e40af",  dot:"#3b82f6" },
  "Out for Delivery":   { bg:"#f5f3ff", c:"#6d28d9",  dot:"#8b5cf6" },
  "Delivered":          { bg:"#d1fae5", c:"#065f46",  dot:"#10b981" },
  "Rejected":           { bg:"#fee2e2", c:"#991b1b",  dot:"#ef4444" },
  "Cancelled":          { bg:"#f1f5f9", c:"#475569",  dot:"#94a3b8" },
};

const AdminDashboard = () => {
  const [data,            setData]            = useState(null);
  const [aiData,          setAiData]          = useState(undefined);
  const [stockPrediction, setStockPrediction] = useState(undefined);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const token    = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchAll = () => {
    setLoading(true);
    axios.get(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setData(r.data)).catch(() => setError("Failed to load.")).finally(() => setLoading(false));
    axios.get(`${API}/admin/ai/demand-prediction`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setAiData(r.data)).catch(() => setAiData(null));
    axios.get(`${API}/admin/ai/stock-prediction`,  { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStockPrediction(r.data)).catch(() => setStockPrediction(null));
  };

  useEffect(() => { fetchAll(); }, [token]);

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",gap:14,color:"#64748b",fontFamily:"'Segoe UI',sans-serif",background:"#f0f4fa" }}>
      <div style={{ width:22,height:22,border:"3px solid #e2e8f0",borderTopColor:"#3b82f6",borderRadius:"50%",animation:"spin .7s linear infinite" }} />
      <span style={{ fontWeight:600 }}>Loading dashboard…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (error) return <div style={{ padding:40,color:"#ef4444",fontFamily:"sans-serif" }}>{error}</div>;

  const { stats, recent_orders, warehouses } = data;

  const statCards = [
    { label:"Total Users",  value:stats.total_users,      accent:"#3b82f6", bg:"#eff6ff", icon:<FaUsers />,      path:"/admin/employees" },
    { label:"Clients",      value:stats.total_clients,    accent:"#10b981", bg:"#f0fdf4", icon:<FaUser />,        path:"/admin/clients" },
    { label:"Drivers",      value:stats.total_drivers,    accent:"#f59e0b", bg:"#fffbeb", icon:<FaTruck />,       path:"/admin/drivers-map" },
    { label:"Warehouses",   value:stats.total_warehouses, accent:"#8b5cf6", bg:"#faf5ff", icon:<FaWarehouse />,   path:"/admin/warehouses" },
    { label:"Total Orders", value:stats.total_orders,     accent:"#0ea5e9", bg:"#f0f9ff", icon:<FaBoxes />,       path:"/admin/orders" },
    { label:"Pending",      value:stats.pending_orders,   accent:"#f59e0b", bg:"#fffbeb", icon:<FaClock />,       path:"/admin/orders" },
    { label:"Delivered",    value:stats.delivered_orders, accent:"#10b981", bg:"#f0fdf4", icon:<FaCheckCircle />, path:"/admin/orders" },
  ];

  const orderColumns = [
    { title:"Order #",   data:"order_number",   render: d => `<span style="font-family:monospace;font-weight:800;color:#1e40af;font-size:13px">#${d}</span>` },
    { title:"Client",    data:null,             render: (_,__,r) => `<div style="font-weight:600;font-size:13px;color:#0f172a">${r.user?.name??"—"}</div><div style="font-size:11px;color:#94a3b8">${r.user?.phone??""}</div>` },
    { title:"Qty",       data:"total_quantity", render: d => `<span style="font-weight:800;color:#0f172a">${d}</span><span style="color:#94a3b8;font-size:11px;margin-left:3px">cyl</span>` },
    { title:"Amount",    data:"total_amount",   render: d => `<strong style="color:#059669;font-size:13px">LKR ${parseFloat(d??0).toLocaleString()}</strong>` },
    { title:"Warehouse", data:null,             render: (_,__,r) => `<span style="font-size:12px;color:#475569">${r.warehouse?.name??`#${r.warehouse_id}`}</span>` },
    { title:"Receipt",   data:"receipt_path",   render: d => d ? `<a href="${STORAGE}${d}" target="_blank" style="color:#3b82f6;font-weight:600;font-size:12px;text-decoration:none">View ↗</a>` : `<span style="color:#cbd5e1;font-size:12px">—</span>` },
    { title:"Status",    data:"status",         render: d => { const s=STATUS[d]??{bg:"#f1f5f9",c:"#334155",dot:"#94a3b8"}; return `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${s.bg};color:${s.c}"><span style="width:6px;height:6px;border-radius:50%;background:${s.dot};display:inline-block;flex-shrink:0"></span>${d}</span>`; } },
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#f0f4fa", minHeight:"100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .adm-kpi:hover{transform:translateY(-4px)!important;box-shadow:0 8px 24px rgba(15,23,42,.13)!important;}
        .adm-kpi-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
        }
        .adm-ai-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 1200px) {
          .adm-kpi-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 768px) {
          .adm-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .adm-ai-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 480px) {
          .adm-kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ══ HERO HEADER ══ */}
      <div style={{
        background:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#1e40af 100%)",
        padding:"28px 36px 80px",
        position:"relative", overflow:"hidden",
      }}>
        {/* Decorative rings */}
        <div style={{ position:"absolute",top:-60,right:-60,width:240,height:240,borderRadius:"50%",border:"1px solid rgba(255,255,255,.06)" }} />
        <div style={{ position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",border:"1px solid rgba(255,255,255,.08)" }} />
        <div style={{ position:"absolute",bottom:-80,left:-40,width:200,height:200,borderRadius:"50%",background:"rgba(59,130,246,.08)" }} />

        <div style={{ position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.45)",letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>
              Administration Panel
            </div>
            <h1 style={{ margin:0,fontSize:26,fontWeight:900,color:"#fff",letterSpacing:"-0.5px",lineHeight:1.2 }}>
              GasHub Operations Center
            </h1>
            <p style={{ margin:"8px 0 0",fontSize:13,color:"rgba(255,255,255,.5)" }}>
              Real-time overview of orders, stock, drivers, and AI insights
            </p>
          </div>
          <button onClick={fetchAll} style={{
            display:"flex",alignItems:"center",gap:8,
            padding:"9px 18px",borderRadius:9,
            background:"rgba(255,255,255,.1)",
            border:"1px solid rgba(255,255,255,.18)",
            color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",
            backdropFilter:"blur(8px)",transition:"background .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.18)"}
          onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,.1)"}>
            <FaSync style={{ fontSize:11 }} />
          </button>
        </div>
      </div>

      {/* ══ KPI STRIP — floats over hero ══ */}
      <div style={{ padding:"0 36px", marginTop:"-44px", position:"relative", zIndex:2 }}>
        <div className="adm-kpi-grid">
          {statCards.map((c, i) => (
            <div
              key={c.label}
              className="adm-kpi"
              onClick={() => navigate(c.path)}
              style={{
                background:"#fff",
                borderRadius:14,
                padding:"18px 16px",
                boxShadow:"0 4px 20px rgba(15,23,42,.1)",
                cursor:"pointer",
                transition:"transform .2s, box-shadow .2s",
                animation:`fadeUp .4s ease ${i*0.05}s both`,
                borderBottom:`3px solid ${c.accent}`,
                position:"relative",
                overflow:"hidden",
              }}>
              {/* Faint accent background */}
              <div style={{
                position:"absolute",top:-10,right:-10,
                width:60,height:60,borderRadius:"50%",
                background:c.bg,opacity:0.7,
              }} />
              <div style={{ position:"relative",zIndex:1 }}>
                <div style={{ fontSize:18,color:c.accent,marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1,marginBottom:6 }}>{c.label}</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#0f172a",lineHeight:1 }}>{c.value?.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"24px 36px", display:"flex", flexDirection:"column", gap:24 }}>

        {/* ══ AI PREDICTIONS ══ */}
        <div className="adm-ai-grid">
          {/* Demand Prediction */}
          <div style={{
            background:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)",
            borderRadius:16, padding:"24px 26px",
            position:"relative", overflow:"hidden",
            boxShadow:"0 8px 32px rgba(30,58,138,.25)",
          }}>
            <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(59,130,246,.12)" }} />
            <div style={{ position:"absolute",bottom:-20,left:-20,width:80,height:80,borderRadius:"50%",background:"rgba(99,102,241,.1)" }} />
            <div style={{ position:"relative",zIndex:1 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:"rgba(59,130,246,.2)",border:"1px solid rgba(59,130,246,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🤖</div>
                <div>
                  <div style={{ fontWeight:800,fontSize:15,color:"#fff" }}>AI Demand Forecast</div>
                  <div style={{ fontSize:11,color:"rgba(255,255,255,.45)",marginTop:1 }}>Predicted cylinders — next month</div>
                </div>
              </div>
              {aiData === undefined && <div style={{ fontSize:13,color:"rgba(255,255,255,.4)",fontStyle:"italic" }}>Fetching AI data…</div>}
              {aiData === null && (
                <div style={{ background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,padding:"12px 16px",color:"rgba(255,255,255,.5)",fontSize:12 }}>
                  AI service offline. Start the Flask server to enable predictions.
                </div>
              )}
              {aiData?.status === false && (
                <div style={{ background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.25)",borderRadius:10,padding:"12px 16px",color:"#fcd34d",fontSize:12 }}>
                  ⚠ {aiData.message}
                </div>
              )}
              {aiData?.status === true && (
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end" }}>
                  <div>
                    <div style={{ fontSize:54,fontWeight:900,color:"#fff",lineHeight:1,letterSpacing:"-1px" }}>
                      {Math.round(aiData.predicted_orders??0).toLocaleString()}
                    </div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,.45)",marginTop:8,display:"flex",alignItems:"center",gap:5 }}>
                      <FaArrowUp style={{ color:"#34d399",fontSize:10 }} /> cylinders expected across all warehouses
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ background:"rgba(59,130,246,.3)",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:700,color:"#93c5fd",marginBottom:6,border:"1px solid rgba(59,130,246,.3)" }}>
                      Month {aiData.next_month}
                    </div>
                    <div style={{ fontSize:11,color:"rgba(255,255,255,.3)" }}>{aiData.data_points} months of data</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stock Prediction */}
          <div style={{ background:"#fff", borderRadius:16, padding:"24px 26px", border:"1.5px solid #e8edf5", boxShadow:"0 2px 12px rgba(15,23,42,.05)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
              <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#eff6ff,#dbeafe)",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>
                <FaChartLine style={{ color:"#3b82f6",fontSize:18 }} />
              </div>
              <div>
                <div style={{ fontWeight:800,fontSize:15,color:"#0f172a" }}>Stock Forecast</div>
                <div style={{ fontSize:11,color:"#64748b",marginTop:1 }}>Per-warehouse restock alerts</div>
              </div>
            </div>
            {stockPrediction === undefined && <div style={{ fontSize:13,color:"#94a3b8",fontStyle:"italic" }}>Fetching predictions…</div>}
            {stockPrediction === null && (
              <div style={{ background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 16px",color:"#dc2626",fontSize:12 }}>
                AI service offline. Start the Flask server.
              </div>
            )}
            {stockPrediction?.status === false && (
              <div style={{ background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"12px 16px",color:"#92400e",fontSize:12 }}>
                ⚠ {stockPrediction.message}
              </div>
            )}
            {stockPrediction?.status === true && (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {stockPrediction.predictions.map(wh => (
                  <div key={wh.id}
                    onClick={() => navigate("/admin/warehouses")}
                    style={{
                      display:"flex",justifyContent:"space-between",alignItems:"center",
                      padding:"12px 16px",borderRadius:11,cursor:"pointer",
                      background:wh.restock_alert?"linear-gradient(135deg,#fef2f2,#fff1f2)":"linear-gradient(135deg,#f0fdf4,#f0fdf9)",
                      border:`1.5px solid ${wh.restock_alert?"#fecaca":"#bbf7d0"}`,
                      transition:"all .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform="translateX(3px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="translateX(0)"; }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:13,color:"#0f172a",marginBottom:3 }}>
                        {wh.restock_alert ? "⚠️" : "✅"} {wh.name}
                      </div>
                      <div style={{ fontSize:11,color:"#64748b" }}>
                        Current: <strong>{wh.current_stock}</strong> · Needs: <strong>{wh.predicted_need}</strong>
                      </div>
                    </div>
                    {wh.restock_alert && (
                      <div style={{
                        background:"linear-gradient(135deg,#dc2626,#ef4444)",
                        color:"#fff",borderRadius:8,padding:"4px 12px",
                        fontSize:12,fontWeight:800,
                        boxShadow:"0 2px 8px rgba(220,38,38,.3)",
                      }}>
                        -{wh.shortage} cyl
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ WAREHOUSES + RECENT ORDERS ══ */}
        <div style={{ display:"grid", gridTemplateColumns:"380px 1fr", gap:20, alignItems:"start" }}>

          {/* Warehouses */}
          <div style={{ background:"#fff", borderRadius:16, border:"1.5px solid #e8edf5", overflow:"hidden", boxShadow:"0 2px 12px rgba(15,23,42,.05)" }}>
            <div style={{ padding:"16px 22px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#f5f3ff,#ede9fe)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <FaWarehouse style={{ color:"#8b5cf6",fontSize:14 }} />
                </div>
                <span style={{ fontWeight:800,fontSize:14,color:"#0f172a" }}>Warehouses</span>
              </div>
              <Link to="/admin/warehouses" style={{ fontSize:12,color:"#3b82f6",fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:4 }}>
                Manage <span style={{ fontSize:14 }}>→</span>
              </Link>
            </div>
            {warehouses.map((w, i) => {
              const pct = w.capacity > 0 ? Math.min(100, ((w.current_stock??0)/w.capacity)*100) : 0;
              const barColor = pct > 85 ? "#ef4444" : pct > 65 ? "#f59e0b" : "#3b82f6";
              return (
                <div key={w.id} style={{ padding:"16px 22px", borderBottom: i < warehouses.length-1 ? "1px solid #f8fafc" : "none" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:14,color:"#0f172a",marginBottom:2 }}>{w.name}</div>
                      <div style={{ fontSize:11,color:"#94a3b8" }}>{w.address}</div>
                    </div>
                    <span style={{
                      fontSize:10,padding:"3px 10px",borderRadius:20,fontWeight:700,
                      background:w.status?"#d1fae5":"#fee2e2",
                      color:w.status?"#065f46":"#991b1b",
                      border:`1px solid ${w.status?"#a7f3d0":"#fca5a5"}`,
                    }}>
                      {w.status ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",marginBottom:6 }}>
                    <span>Capacity used</span>
                    <span style={{ fontWeight:700,color:barColor }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ background:"#f1f5f9",borderRadius:6,height:6,overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`,height:"100%",borderRadius:6,background:barColor,transition:"width .5s ease" }} />
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:9,fontSize:12 }}>
                    <span style={{ color:"#64748b" }}>Active orders: <strong style={{ color:"#1e40af" }}>{w.active_orders_count}</strong></span>
                    <span style={{ color:"#64748b" }}>Capacity: <strong style={{ color:"#0f172a" }}>{w.capacity}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Orders */}
          <div style={{ background:"#fff", borderRadius:16, border:"1.5px solid #e8edf5", overflow:"hidden", boxShadow:"0 2px 12px rgba(15,23,42,.05)" }}>
            <div style={{ padding:"16px 22px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#eff6ff,#dbeafe)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <FaFileInvoice style={{ color:"#3b82f6",fontSize:14 }} />
                </div>
                <span style={{ fontWeight:800,fontSize:14,color:"#0f172a" }}>Recent Orders</span>
              </div>
              <Link to="/admin/orders" style={{ fontSize:12,color:"#3b82f6",fontWeight:700,textDecoration:"none",display:"flex",alignItems:"center",gap:4 }}>
                View All <span style={{ fontSize:14 }}>→</span>
              </Link>
            </div>
            <DataTable
              id="dashboard-orders-table"
              columns={orderColumns}
              data={recent_orders}
              options={{ order:[[0,"desc"]], pageLength:8, lengthMenu:[8,15,25] }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
