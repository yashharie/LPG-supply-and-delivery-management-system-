import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000/api";

/* ── Typing animation ── */
const TypingDots = () => (
  <div style={{ display: "flex", gap: 5, padding: "10px 14px", alignItems: "center" }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{
        width: 8, height: 8, borderRadius: "50%", background: "#93c5fd",
        animation: "chatDot 1.2s ease-in-out infinite",
        animationDelay: `${i * 0.2}s`,
      }} />
    ))}
  </div>
);

/* ── Quick action buttons shown in welcome view ── */
const QUICK_ACTIONS = [
  { label: "📦 Place Order",    msg: "How do I place a gas order?" },
  { label: "🚚 Track Order",    msg: "Where is my current order?" },
  { label: "❓ FAQs",           msg: "Show me frequently asked questions" },
];

/* ── FAQ list shown when user clicks FAQs ── */
const FAQS = [
  { q: "What is the minimum order quantity?",    a: "The minimum order is 20 cylinders per order." },
  { q: "How is the delivery fee calculated?",    a: "Delivery fee = LKR 100 base + LKR 100 per km from the warehouse to your location." },
  { q: "Can I cancel my order?",                 a: "Yes — orders can be cancelled only while they are still in Pending status." },
  { q: "What if the warehouse is out of stock?", a: "You can place a Pre-Order. Your cylinders will be auto-delivered once the warehouse is restocked." },
  { q: "How do I track my delivery?",            a: "Go to My Orders → find your order → click 'Track Driver' to see the driver's live GPS location." },
  { q: "What is a partial delivery?",            a: "If the warehouse has some but not all your cylinders, we deliver what's available now and reserve the rest for later." },
  { q: "How do I upload my payment receipt?",    a: "After confirming your order, upload your bank slip or payment screenshot on the payment step." },
  { q: "Is LPG gas safe to store at home?",      a: "Yes — keep cylinders upright in a well-ventilated area, away from heat sources. Turn off the regulator when not in use." },
  { q: "How do I report a problem?",             a: "Use the Support page to file a complaint or report an issue. You'll receive a ticket ID to track your case." },
  { q: "Which cylinder brands are available?",   a: "GasHub offers Litro Gas and Laugfs Gas cylinders in multiple sizes (2.3 kg to 37.5 kg)." },
];

const ChatBot = ({ token, currentUser }) => {
  const firstName = currentUser?.name?.split(" ")[0] ?? "there";

  const WELCOME_MSG = {
    from: "bot",
    type: "welcome",
    text: `Hello, ${firstName}! 👋\nHow can I help you today?`,
  };

  const [open,     setOpen]     = useState(false);
  const [view,     setView]     = useState("home"); // "home" | "chat" | "faq"
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [loading,  setLoading]  = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open && view === "chat") setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, view]);

  /* ── Send message to AI ── */
  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setView("chat");
    setMessages((p) => [...p, { from: "user", text: msg }]);
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/client/chat`,
        { message: msg },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((p) => [...p, { from: "bot", text: res.data.reply }]);
    } catch {
      setMessages((p) => [...p, {
        from: "bot",
        text: "Sorry, I'm having trouble connecting right now. Please try again shortly.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const resetChat = () => {
    setMessages([WELCOME_MSG]);
    setInput("");
    setView("home");
  };

  const handleQuickAction = (action) => {
    if (action.label.includes("FAQs")) { setView("faq"); return; }
    send(action.msg);
  };

  return (
    <>
      <style>{`
        @keyframes chatDot {
          0%,80%,100% { transform:scale(0.65);opacity:0.4; }
          40%          { transform:scale(1);  opacity:1;   }
        }
        @keyframes chatSlideUp {
          from { opacity:0; transform:translateY(24px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);    }
        }
        @keyframes chatPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(30,64,175,0.45); }
          60%     { box-shadow:0 0 0 10px rgba(30,64,175,0);  }
        }
        .chat-msg-bubble { word-break:break-word; white-space:pre-wrap; }
        .faq-item { transition:background 0.15s; }
        .faq-item:hover { background:#eff6ff !important; }
        .chat-input:focus { border-color:#3b82f6 !important; outline:none; }
        .chat-send-btn:disabled { cursor:default !important; }
        .chat-send-btn:not(:disabled):hover { filter:brightness(1.1); }
      `}</style>

      {/* ── Floating bubble ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="GasHub AI Assistant"
        style={{
          position:"fixed", bottom:28, right:28,
          width:58, height:58, borderRadius:"50%",
          background:"linear-gradient(135deg,#1e40af,#3b82f6)",
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:26, color:"#fff",
          boxShadow:"0 4px 20px rgba(30,64,175,0.5)",
          zIndex:99998,
          animation: open ? "none" : "chatPulse 2.2s ease-in-out infinite",
          transition:"transform 0.18s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)";   }}
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* ── Chat window ── */}
      {open && (
        <div style={{
          position:"fixed", bottom:100, right:28,
          width:370,
          maxHeight:600,
          background:"#fff",
          borderRadius:18,
          boxShadow:"0 16px 48px rgba(15,23,42,0.2)",
          border:"1px solid #e2e8f0",
          display:"flex", flexDirection:"column",
          zIndex:99997,
          animation:"chatSlideUp 0.22s ease",
          overflow:"hidden",
          fontFamily:"'Segoe UI',system-ui,sans-serif",
        }}>

          {/* ══ HEADER ══ */}
          <div style={{
            background:"linear-gradient(135deg,#1e3a8a,#1e40af)",
            padding:"14px 16px",
            display:"flex", alignItems:"center", gap:10,
            flexShrink:0,
          }}>
            {/* Bot avatar */}
            <div style={{
              width:40, height:40, borderRadius:"50%",
              background:"rgba(255,255,255,0.15)",
              border:"2px solid rgba(255,255,255,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, flexShrink:0,
            }}>🤖</div>

            {/* Title + status */}
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#fff", letterSpacing:"-0.2px" }}>
                GasHub Assistant
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80" }} />
                Online · AI Powered
              </div>
            </div>

            {/* New Chat */}
            <button onClick={resetChat} title="New Chat" style={{
              background:"rgba(255,255,255,0.12)",
              border:"1px solid rgba(255,255,255,0.25)",
              borderRadius:8, padding:"5px 10px",
              color:"#fff", fontSize:11, fontWeight:600,
              cursor:"pointer", marginRight:6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.22)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.12)"; }}>
              🔄 New
            </button>

            {/* Close */}
            <button onClick={() => setOpen(false)} title="Close" style={{
              background:"rgba(255,255,255,0.12)",
              border:"1px solid rgba(255,255,255,0.25)",
              borderRadius:"50%", width:28, height:28,
              color:"#fff", fontSize:14, fontWeight:700,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="rgba(255,255,255,0.12)"; }}>
              ✕
            </button>
          </div>

          {/* ══ HOME VIEW ══ */}
          {view === "home" && (
            <div style={{
              flex:1, overflowY:"auto", padding:"20px 16px",
              background:"linear-gradient(180deg,#f0f7ff 0%,#f8fafc 100%)",
              display:"flex", flexDirection:"column", gap:16,
            }}>
              {/* Welcome bubble */}
              <div style={{
                background:"#fff", borderRadius:"16px 16px 16px 4px",
                padding:"14px 16px",
                boxShadow:"0 2px 12px rgba(30,64,175,0.1)",
                border:"1px solid #e0eaff",
              }}>
                <div style={{ fontWeight:700, fontSize:15, color:"#1e3a8a", marginBottom:6 }}>
                  Hello! 👋
                </div>
                <div style={{ fontSize:13, color:"#475569", lineHeight:1.6 }}>
                  How can I help you today?
                </div>
              </div>

              {/* Quick action buttons */}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {QUICK_ACTIONS.map((a) => (
                  <button key={a.label} onClick={() => handleQuickAction(a)} style={{
                    background:"#fff",
                    border:"1.5px solid #bfdbfe",
                    borderRadius:10, padding:"11px 14px",
                    textAlign:"left", cursor:"pointer",
                    fontSize:13, fontWeight:600, color:"#1e40af",
                    display:"flex", alignItems:"center", gap:8,
                    transition:"all 0.15s",
                    boxShadow:"0 1px 4px rgba(30,64,175,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background="#eff6ff";
                    e.currentTarget.style.borderColor="#3b82f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background="#fff";
                    e.currentTarget.style.borderColor="#bfdbfe";
                  }}>
                    {a.label}
                    <span style={{ marginLeft:"auto", color:"#93c5fd", fontSize:14 }}>›</span>
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div style={{ borderTop:"1px dashed #e2e8f0", paddingTop:12 }}>
                <div style={{ fontSize:11, color:"#94a3b8", marginBottom:8, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>
                  Or ask me anything…
                </div>
              </div>
              <div ref={bottomRef} />
            </div>
          )}

          {/* ══ FAQ VIEW ══ */}
          {view === "faq" && (
            <div style={{
              flex:1, overflowY:"auto", background:"#f8fafc",
            }}>
              {/* FAQ header */}
              <div style={{
                padding:"12px 16px",
                borderBottom:"1px solid #e2e8f0",
                display:"flex", alignItems:"center", gap:8,
                background:"#fff",
              }}>
                <button onClick={() => setView("home")} style={{
                  background:"none", border:"none", cursor:"pointer",
                  fontSize:16, color:"#1e40af", padding:0,
                  display:"flex", alignItems:"center",
                }}>‹</button>
                <span style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>
                  ❓ Frequently Asked Questions
                </span>
              </div>

              {/* FAQ items */}
              <div style={{ padding:"8px 0" }}>
                {FAQS.map((f, i) => (
                  <FaqItem key={i} q={f.q} a={f.a} onAsk={() => send(f.q)} />
                ))}
              </div>
              <div ref={bottomRef} />
            </div>
          )}

          {/* ══ CHAT VIEW ══ */}
          {view === "chat" && (
            <div style={{
              flex:1, overflowY:"auto", padding:"12px 14px",
              display:"flex", flexDirection:"column", gap:8,
              background:"#f8fafc", minHeight:0,
            }}>
              {messages.filter(m => m.type !== "welcome").map((m, i) => (
                <div key={i} style={{
                  display:"flex",
                  justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                }}>
                  {m.from === "bot" && (
                    <div style={{
                      width:28, height:28, borderRadius:"50%", flexShrink:0,
                      background:"linear-gradient(135deg,#1e40af,#3b82f6)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:13, marginRight:7, marginTop:2,
                    }}>🤖</div>
                  )}
                  <div className="chat-msg-bubble" style={{
                    maxWidth:"78%",
                    padding:"9px 13px",
                    borderRadius: m.from === "user"
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                    background: m.from === "user"
                      ? "linear-gradient(135deg,#1e40af,#3b82f6)"
                      : "#fff",
                    color: m.from === "user" ? "#fff" : "#0f172a",
                    fontSize:13, lineHeight:1.6,
                    boxShadow:"0 1px 4px rgba(15,23,42,0.08)",
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display:"flex", justifyContent:"flex-start", alignItems:"flex-end", gap:7 }}>
                  <div style={{
                    width:28, height:28, borderRadius:"50%",
                    background:"linear-gradient(135deg,#1e40af,#3b82f6)",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:13,
                  }}>🤖</div>
                  <div style={{
                    background:"#fff", borderRadius:"16px 16px 16px 4px",
                    boxShadow:"0 1px 4px rgba(15,23,42,0.08)",
                  }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {/* ══ INPUT BAR (shown in home + chat views) ══ */}
          {view !== "faq" && (
            <div style={{
              padding:"10px 12px",
              borderTop:"1px solid #e2e8f0",
              display:"flex", gap:8, background:"#fff",
              flexShrink:0,
            }}>
              <input
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type your message…"
                disabled={loading}
                style={{
                  flex:1, border:"1.5px solid #e2e8f0",
                  borderRadius:24, padding:"9px 16px",
                  fontSize:13, background:"#f8fafc", color:"#0f172a",
                  transition:"border-color 0.15s",
                }}
              />
              <button
                className="chat-send-btn"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  width:40, height:40, borderRadius:"50%", flexShrink:0,
                  background: input.trim() && !loading
                    ? "linear-gradient(135deg,#1e40af,#3b82f6)"
                    : "#e2e8f0",
                  border:"none",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:17,
                  color: input.trim() && !loading ? "#fff" : "#94a3b8",
                  transition:"all 0.15s",
                }}
              >
                ➤
              </button>
            </div>
          )}

        </div>
      )}
    </>
  );
};

/* ── FAQ accordion item ── */
const FaqItem = ({ q, a, onAsk }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="faq-item" style={{
      borderBottom:"1px solid #f1f5f9",
      background:"#fff", margin:"0 8px 6px",
      borderRadius:10, overflow:"hidden",
      boxShadow:"0 1px 3px rgba(15,23,42,0.04)",
    }}>
      {/* Question row */}
      <button onClick={() => setExpanded((v) => !v)} style={{
        width:"100%", background:"none", border:"none",
        padding:"12px 14px", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:10, textAlign:"left",
      }}>
        <span style={{ fontSize:13, fontWeight:600, color:"#1e3a8a", lineHeight:1.4 }}>{q}</span>
        <span style={{
          fontSize:16, color:"#3b82f6", flexShrink:0,
          transition:"transform 0.2s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
        }}>⌄</span>
      </button>

      {/* Answer */}
      {expanded && (
        <div style={{ padding:"0 14px 12px" }}>
          <p style={{ margin:0, fontSize:12, color:"#475569", lineHeight:1.7 }}>{a}</p>
          <button onClick={onAsk} style={{
            marginTop:8, background:"#eff6ff",
            border:"1px solid #bfdbfe", borderRadius:6,
            padding:"4px 12px", fontSize:11, fontWeight:600,
            color:"#1e40af", cursor:"pointer",
          }}>
            Ask AI about this →
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
