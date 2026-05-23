import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://autoflowng-backend-production.up.railway.app";

// ─── MARKDOWN RENDERER ────────────────────────────────────────────
// Converts AI markdown responses (**, ##, -, 1.) to readable styled elements
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let listType = null;
  let k = 0;

  function flushList() {
    if (!listItems.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      React.createElement(Tag, { key: k++, style: { margin:"5px 0 5px 20px", padding:0, lineHeight:1.7 } },
        listItems.map((item, i) =>
          React.createElement("li", { key: i, style: { marginBottom:3 } }, renderInline(item))
        )
      )
    );
    listItems = []; listType = null;
  }

  function renderInline(txt) {
    const out = []; let rem = txt; let i = 0;
    while (rem) {
      const bm = rem.match(/\*\*(.+?)\*\*/);
      const im = rem.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      const fb = bm ? bm.index : Infinity;
      const fi = im ? im.index : Infinity;
      if (fb === Infinity && fi === Infinity) { out.push(rem); break; }
      if (fb <= fi) {
        if (fb > 0) out.push(rem.slice(0, fb));
        out.push(React.createElement("strong", { key: i++, style:{ fontWeight:800 } }, bm[1]));
        rem = rem.slice(fb + bm[0].length);
      } else {
        if (fi > 0) out.push(rem.slice(0, fi));
        out.push(React.createElement("em", { key: i++, style:{ fontStyle:"italic" } }, im[1]));
        rem = rem.slice(fi + im[0].length);
      }
    }
    return out;
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^## /.test(line)) {
      flushList();
      elements.push(<div key={k++} style={{ fontWeight:900, fontSize:"1.05em", fontFamily:"'Syne',sans-serif", marginTop:14, marginBottom:5, letterSpacing:"-0.01em" }}>{renderInline(line.slice(3))}</div>);
    } else if (/^### /.test(line)) {
      flushList();
      elements.push(<div key={k++} style={{ fontWeight:800, fontSize:"0.97em", fontFamily:"'Syne',sans-serif", marginTop:10, marginBottom:4 }}>{renderInline(line.slice(4))}</div>);
    } else if (/^[-*] /.test(line.trim())) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listItems.push(line.trim().slice(2));
    } else if (/^\d+\. /.test(line.trim())) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listItems.push(line.trim().replace(/^\d+\. /, ""));
    } else if (line.trim() === "" || line.trim() === "---") {
      flushList();
      elements.push(<div key={k++} style={{ height: line.trim() === "---" ? 0 : 5, borderTop: line.trim() === "---" ? "1px solid rgba(255,255,255,0.08)" : "none", margin: line.trim() === "---" ? "8px 0" : 0 }}/>);
    } else {
      flushList();
      elements.push(<div key={k++} style={{ lineHeight:1.7, marginBottom:1 }}>{renderInline(line)}</div>);
    }
  }
  flushList();
  return React.createElement(React.Fragment, null, ...elements);
}

// ═══════════════════════════════════════════════════════════════
// SERVER STATUS HOOK + BADGE + NOTIFY BUTTON
// Normal mode : pings every 30 s
// Watch mode  : pings every 5 s; fires onBackOnline() the moment the
//               server responds, then reverts to normal polling.
// ═══════════════════════════════════════════════════════════════
function useServerStatus() {
  // Start as "online" — don't block the UI until we KNOW it's offline.
  // This prevents false "Server offline" on slow connections or cold starts.
  const [status, setStatus]   = useState("online");
  const [latency, setLatency] = useState(null);
  const [watching, setWatching] = useState(false);
  const onBackRef   = useRef(null);
  const intervalRef = useRef(null);
  const failCount   = useRef(0); // only show offline after 2 consecutive failures

  const check = useCallback(async () => {
    const t0 = Date.now();
    try {
      // Use 15s timeout — Render cold starts can take up to 90s but
      // we don't want to block the UI that long. We just retry quickly.
      const res = await fetch(`${API_BASE}/api/ping`, {
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
      const ms = Date.now() - t0;
      if (res.ok) {
        failCount.current = 0;
        setLatency(ms);
        setStatus(prev => {
          if (prev !== "online" && onBackRef.current) {
            onBackRef.current();
            onBackRef.current = null;
            setWatching(false);
          }
          return "online";
        });
      } else {
        failCount.current++;
        if (failCount.current >= 2) { setStatus("offline"); setLatency(null); }
      }
    } catch (e) {
      failCount.current++;
      if (failCount.current === 1) {
        // First failure — could be a slow connection. Show "waking" not "offline".
        setStatus("waking");
      } else if (failCount.current >= 2) {
        setStatus(e.name === "TimeoutError" || e.name === "AbortError" ? "waking" : "offline");
        setLatency(null);
      }
    }
  }, []);

  const startPolling = useCallback((ms) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(check, ms);
  }, [check]);

  useEffect(() => {
    // Delay the first check by 3s so the page renders fast before any ping
    const init = setTimeout(() => {
      check();
      startPolling(30_000);
    }, 3000);
    return () => { clearTimeout(init); clearInterval(intervalRef.current); };
  }, [check, startPolling]);

  useEffect(() => {
    startPolling(watching ? 5_000 : 30_000);
  }, [watching, startPolling]);

  const notifyWhenOnline = useCallback((cb) => {
    onBackRef.current = cb;
    setWatching(true);
    check();
  }, [check]);

  const cancelNotify = useCallback(() => {
    onBackRef.current = null;
    setWatching(false);
  }, []);

  return { status, latency, watching, recheck: check, notifyWhenOnline, cancelNotify };
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL TIME SYSTEM — live multi-zone clock, auto-detects region
// ═══════════════════════════════════════════════════════════════
const TIME_ZONES = [
  { id:"local",  label:"Local",       tz:"local",               flag:"📍" },
  { id:"lagos",  label:"Nigeria",     tz:"Africa/Lagos",        flag:"🇳🇬" },
  { id:"accra",  label:"Ghana",       tz:"Africa/Accra",        flag:"🇬🇭" },
  { id:"ny",     label:"New York",    tz:"America/New_York",    flag:"🗽" },
  { id:"la",     label:"Los Angeles", tz:"America/Los_Angeles", flag:"🌴" },
  { id:"london", label:"London",      tz:"Europe/London",       flag:"🇬🇧" },
  { id:"dubai",  label:"Dubai",       tz:"Asia/Dubai",          flag:"🇦🇪" },
];

function fmtLiveTime(tz) {
  const opts = { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true };
  if (tz === "local") return new Date().toLocaleTimeString("en-US", opts);
  try { return new Date().toLocaleTimeString("en-US", { ...opts, timeZone:tz }); }
  catch { return "--:--:--"; }
}

function fmtOffset(tz) {
  if (tz === "local") return "";
  try {
    const s = new Intl.DateTimeFormat("en-US",{timeZone:tz,timeZoneName:"short"}).formatToParts(new Date());
    return s.find(p=>p.type==="timeZoneName")?.value || "";
  } catch { return ""; }
}

function detectHomeZone() {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/Lagos|West.Africa/i.test(z))               return "lagos";
    if (/Accra/i.test(z))                            return "accra";
    if (/America\/New_York/i.test(z))                return "ny";
    if (/America\/(Los_Angeles|Pacific)/i.test(z))  return "la";
    if (/America\//i.test(z))                        return "ny";
    if (/Africa\//i.test(z))                         return "lagos";
    if (/London/i.test(z))                           return "london";
    if (/Dubai/i.test(z))                            return "dubai";
    return null;
  } catch { return null; }
}

function useLiveTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
}

// ─── User clock: shows ONLY the user's detected local timezone ───
function GlobalTimeClock({ isMobile }) {
  useLiveTick();
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } })();
  const regionData = detectRegionData();
  const flag = (() => {
    const code = (regionData.code || "").toLowerCase();
    if (!code || code.length !== 2) return "🌍";
    const pts = [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
    return pts.join("");
  })();
  const tzLabel = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZoneName:"short" }).formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value || "";
    } catch { return ""; }
  })();
  const localTime = fmtLiveTime(tz || "local");
  const country = regionData.country || "Local";

  return (
    <div style={{ background:"rgba(0,0,0,0.22)", borderBottom:`1px solid rgba(255,255,255,0.05)`, padding:isMobile?"5px 16px":"6px 28px", display:"flex", alignItems:"center", gap:isMobile?10:16, overflowX:"auto", flexShrink:0 }}>
      <span style={{ fontSize:9, color:"rgba(232,238,255,0.28)", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>🕐 LIVE</span>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <span style={{ fontSize:14 }}>{flag}</span>
        <div>
          <div style={{ fontSize:9, color:"rgba(232,238,255,0.35)", fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em", lineHeight:1, marginBottom:1 }}>{country}{tzLabel ? ` · ${tzLabel}` : ""}</div>
          <div style={{ fontSize:14, fontWeight:900, fontFamily:"'DM Mono',monospace", color:"#00C896", lineHeight:1.2 }}>{localTime}</div>
        </div>
      </div>
      <div style={{ marginLeft:"auto", flexShrink:0 }}>
        <span style={{ fontSize:9, color:"rgba(232,238,255,0.18)", fontFamily:"'DM Mono',monospace" }}>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
      </div>
    </div>
  );
}

// ─── Admin clock: all major world zones displayed professionally ──
function AdminWorldClock() {
  useLiveTick();
  const WORLD_ZONES = [
    { label:"Lagos",     tz:"Africa/Lagos",        flag:"🇳🇬" },
    { label:"London",    tz:"Europe/London",       flag:"🇬🇧" },
    { label:"New York",  tz:"America/New_York",    flag:"🗽" },
    { label:"Dubai",     tz:"Asia/Dubai",          flag:"🇦🇪" },
    { label:"Mumbai",    tz:"Asia/Kolkata",        flag:"🇮🇳" },
    { label:"Singapore", tz:"Asia/Singapore",      flag:"🇸🇬" },
    { label:"Tokyo",     tz:"Asia/Tokyo",          flag:"🇯🇵" },
    { label:"São Paulo", tz:"America/Sao_Paulo",   flag:"🇧🇷" },
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:18, background:"rgba(0,0,0,0.22)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"8px 18px", overflowX:"auto" }}>
      <span style={{ fontSize:9, color:"rgba(232,238,255,0.28)", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em", flexShrink:0 }}>🌐 WORLD</span>
      {WORLD_ZONES.map(z => {
        const offset = (() => { try { return new Intl.DateTimeFormat("en-US",{timeZone:z.tz,timeZoneName:"short"}).formatToParts(new Date()).find(p=>p.type==="timeZoneName")?.value||""; } catch { return ""; } })();
        return (
          <div key={z.tz} style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
            <span style={{ fontSize:11 }}>{z.flag}</span>
            <div>
              <div style={{ fontSize:8, color:"rgba(232,238,255,0.32)", fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em", lineHeight:1, marginBottom:1 }}>{z.label}{offset?` · ${offset}`:""}</div>
              <div style={{ fontSize:11, fontWeight:900, fontFamily:"'DM Mono',monospace", color:"rgba(232,238,255,0.85)", lineHeight:1.2 }}>{fmtLiveTime(z.tz)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ServerStatusBadge({ status, latency, compact = false }) {
  const cfg = {
    checking: { color: "#94A3B8", dot: "#94A3B8", label: "Checking…",         pulse: false },
    online:   { color: "#00C896", dot: "#00C896", label: "Server online",      pulse: true  },
    waking:   { color: "#FBBF24", dot: "#FBBF24", label: "Server waking up…", pulse: true  },
    offline:  { color: "#FB7185", dot: "#FB7185", label: "Server offline",     pulse: false },
  }[status] ?? { color: "#94A3B8", dot: "#94A3B8", label: "Unknown", pulse: false };

  const latencyStr = status === "online" && latency != null ? ` · ${latency}ms` : "";

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: `${cfg.color}14`, border: `1px solid ${cfg.color}35`,
      borderRadius: 20, padding: compact ? "3px 10px" : "5px 12px",
      fontSize: compact ? 11 : 12, fontWeight: 700,
      fontFamily: "'DM Sans', sans-serif", userSelect: "none",
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: compact ? 6 : 7, height: compact ? 6 : 7,
        borderRadius: "50%", background: cfg.dot, flexShrink: 0,
        animation: cfg.pulse ? "glw 2s ease infinite" : "none",
      }}/>
      <span style={{ color: cfg.color }}>
        {cfg.label}{!compact && latencyStr}
      </span>
    </div>
  );
}

/**
 * Button that appears when status is "waking" or "offline".
 * Clicking it registers a background watcher and shows feedback when
 * the server comes back online.
 *
 * Props:
 *   watching        – boolean, whether watch mode is active
 *   onWatch()       – call to enable watching
 *   onCancel()      – call to cancel watching
 *   variant         – "modal" (full-width) | "header" (compact icon-button)
 */
function ServerNotifyButton({ watching, onWatch, onCancel, variant = "modal" }) {
  if (variant === "header") {
    return (
      <button
        onClick={watching ? onCancel : onWatch}
        title={watching ? "Cancel — stop watching for server recovery" : "Notify me when server is back online"}
        style={{
          background: watching ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${watching ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 8, padding: "3px 9px", cursor: "pointer",
          fontSize: 11, fontWeight: 700, color: watching ? "#FBBF24" : "rgba(232,238,255,0.45)",
          fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
          display: "inline-flex", alignItems: "center", gap: 5, transition: "all 0.18s",
        }}
      >
        <span style={{ animation: watching ? "glw 1.5s ease infinite" : "none" }}>
          {watching ? "🔔" : "🔕"}
        </span>
        {watching ? "Watching…" : "Notify me"}
      </button>
    );
  }

  // modal variant — shown below the status badge
  return (
    <div style={{ marginTop: 12 }}>
      {watching ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)",
          borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#FBBF24", fontWeight: 700 }}>
            <span style={{ animation: "glw 1.5s ease infinite" }}>🔔</span>
            Watching — you'll be notified when the server is back
          </div>
          <div style={{ fontSize: 12, color: "rgba(232,238,255,0.35)", lineHeight: 1.5 }}>
            Checking every 5 seconds in the background.
          </div>
          <button onClick={onCancel} style={{
            marginTop: 2, background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 7, padding: "5px 14px", color: "rgba(232,238,255,0.4)",
            fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          }}>
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={onWatch} style={{
          width: "100%", background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          padding: "10px 0", color: "rgba(232,238,255,0.5)", fontSize: 13,
          fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "all 0.18s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(251,191,36,0.35)"; e.currentTarget.style.color = "#FBBF24"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(232,238,255,0.5)"; }}
        >
          🔔 Notify me when back online
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("AutoFlowNG error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:"100vh", background:"#04060F", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ textAlign:"center", maxWidth:420 }}>
            <div style={{ fontSize:56, marginBottom:20 }}>⚠️</div>
            <div style={{ fontSize:22, fontWeight:900, fontFamily:"'Syne',sans-serif", color:"#E8EEFF", marginBottom:12 }}>Something went wrong</div>
            <div style={{ fontSize:15, color:"rgba(232,238,255,0.5)", marginBottom:28, lineHeight:1.7 }}>An unexpected error occurred. Please refresh the page to try again.</div>
            <button onClick={() => window.location.reload()} style={{ background:"#00C896", color:"#04221A", border:"none", borderRadius:12, padding:"13px 32px", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// IMMERSIVE 3D / SCROLL / PARALLAX SYSTEM
// ═══════════════════════════════════════════════════════════════

// WebGL animated gradient mesh — fullscreen background
function GradientMesh() {
  const ref = useRef(null);
  useEffect(() => {
    const isMobileDevice = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (isMobileDevice) return;
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true });
    if (!gl) return;
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; gl.viewport(0,0,canvas.width,canvas.height); };
    resize(); addEventListener("resize", resize);

    const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const fs = `precision highp float;uniform vec2 R;uniform float T;uniform vec2 M;
      vec3 pal(float t){return 0.5+0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t));}
      float n(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      float fbm(vec2 p){float v=0.;float a=0.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=0.5;}return v;}
      void main(){
        vec2 u=(gl_FragCoord.xy-0.5*R)/R.y;
        vec2 m=(M-0.5*R)/R.y;
        float t=T*0.08;
        float f=fbm(u*1.4+vec2(t,-t*0.7)+m*0.4);
        float g=fbm(u*2.3-vec2(t*0.6,t)+m*0.2);
        vec3 a=vec3(0.00,0.78,0.59);
        vec3 b=vec3(0.22,0.74,0.97);
        vec3 c=vec3(0.65,0.55,0.98);
        vec3 col=mix(a,b,smoothstep(0.2,0.85,f));
        col=mix(col,c,smoothstep(0.35,0.95,g));
        float d=length(u-m*0.6);
        col+=0.08*exp(-d*2.2);
        col*=0.25;
        col+=vec3(0.015,0.02,0.04);
        gl_FragColor=vec4(col,1.0);
      }`;
    const mk=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh;};
    const prog=gl.createProgram();gl.attachShader(prog,mk(gl.VERTEX_SHADER,vs));gl.attachShader(prog,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(prog,"p");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const uR=gl.getUniformLocation(prog,"R"),uT=gl.getUniformLocation(prog,"T"),uM=gl.getUniformLocation(prog,"M");
    let mx=innerWidth/2,my=innerHeight/2;
    const mm=e=>{mx=e.clientX;my=innerHeight-e.clientY;};
    addEventListener("mousemove",mm,{passive:true});
    let raf=0;const start=performance.now();
    const loop=()=>{const t=(performance.now()-start)/1000;gl.uniform2f(uR,canvas.width,canvas.height);gl.uniform1f(uT,t);gl.uniform2f(uM,mx,my);gl.drawArrays(gl.TRIANGLES,0,6);raf=requestAnimationFrame(loop);};
    loop();
    return ()=>{cancelAnimationFrame(raf);removeEventListener("resize",resize);removeEventListener("mousemove",mm);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100vw",height:"100vh",zIndex:0,pointerEvents:"none",opacity:0.85}}/>;
}

// 3D rotating wireframe sphere — pure canvas projection, scroll + mouse reactive
function WireSphere3D({ size=520 }) {
  const ref = useRef(null);
  useEffect(() => {
    const isMobileDevice = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    if (isMobileDevice) return;
    const canvas = ref.current; if (!canvas) return;
    const dpr = Math.min(devicePixelRatio||1, 2);
    canvas.width = size*dpr; canvas.height = size*dpr;
    const ctx = canvas.getContext("2d"); ctx.scale(dpr,dpr);
    const R = size*0.38;
    const LAT=26, LON=36;
    const pts=[];
    for(let i=0;i<=LAT;i++){const th=Math.PI*i/LAT;for(let j=0;j<LON;j++){const ph=2*Math.PI*j/LON;pts.push([R*Math.sin(th)*Math.cos(ph),R*Math.cos(th),R*Math.sin(th)*Math.sin(ph)]);}}
    let rx=0.4,ry=0,raf=0,scrollY=0,mx=0,my=0;
    const onScroll=()=>{scrollY=window.scrollY;};
    const onMove=(e)=>{const r=canvas.getBoundingClientRect();mx=(e.clientX-r.left-size/2)/size;my=(e.clientY-r.top-size/2)/size;};
    addEventListener("scroll",onScroll,{passive:true});
    addEventListener("mousemove",onMove,{passive:true});
    const loop=()=>{
      ctx.clearRect(0,0,size,size);
      ry += 0.008; rx = 0.45;
      const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);
      const proj=pts.map(([x,y,z])=>{
        const x1=cy*x+sy*z, z1=-sy*x+cy*z;
        const y1=cx*y-sx*z1, z2=sx*y+cx*z1;
        const f=520/(520+z2);
        return [size/2+x1*f, size/2+y1*f, z2, f];
      });
      ctx.lineWidth=0.7;
      for(let i=0;i<LAT;i++){
        for(let j=0;j<LON;j++){
          const a=proj[i*LON+j], b=proj[i*LON+((j+1)%LON)], c=proj[(i+1)*LON+j], d=proj[(i+1)*LON+((j+1)%LON)];
          const za=(a[2]+b[2])/2, zc=(a[2]+c[2])/2, zd=(a[2]+d[2])/2;
          const ga=Math.max(0,Math.min(1,(za+R)/(2*R)));
          const gc=Math.max(0,Math.min(1,(zc+R)/(2*R)));
          const gd=Math.max(0,Math.min(1,(zd+R)/(2*R)));
          ctx.strokeStyle=`rgba(0,200,150,${0.10+ga*0.55})`;
          ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
          ctx.strokeStyle=`rgba(0,200,150,${0.10+gc*0.55})`;
          ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();
          ctx.strokeStyle=`rgba(0,200,150,${0.08+gd*0.45})`;
          ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(d[0],d[1]);ctx.stroke();
        }
      }
      raf=requestAnimationFrame(loop);
    };
    loop();
    return ()=>{cancelAnimationFrame(raf);removeEventListener("scroll",onScroll);removeEventListener("mousemove",onMove);};
  },[size]);
  return <canvas ref={ref} style={{width:size,height:size,display:"block",filter:"drop-shadow(0 0 80px rgba(0,200,150,0.55))"}}/>;
}

// Parallax wrapper
function Parallax({ speed=0.2, children, style={} }) {
  const ref = useRef(null);
  useEffect(()=>{
    let raf=0;
    const apply=()=>{ if(!ref.current) return; const r=ref.current.getBoundingClientRect(); const center=r.top+r.height/2-innerHeight/2; ref.current.style.transform=`translate3d(0,${center*speed*-1}px,0)`; };
    const on=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(apply);};
    apply(); addEventListener("scroll",on,{passive:true}); addEventListener("resize",on);
    return ()=>{cancelAnimationFrame(raf);removeEventListener("scroll",on);removeEventListener("resize",on);};
  },[speed]);
  return <div ref={ref} style={{willChange:"transform",...style}}>{children}</div>;
}

// Scroll reveal
function Reveal({ children, delay=0, y=24, style={} }) {
  const ref = useRef(null);
  const [vis,setVis] = useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){setVis(true);io.disconnect();}});},{threshold:0.15});
    io.observe(el); return ()=>io.disconnect();
  },[]);
  return <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":`translateY(${y}px)`,transition:`opacity 0.9s ${delay}ms cubic-bezier(.2,.7,.2,1),transform 0.9s ${delay}ms cubic-bezier(.2,.7,.2,1)`,...style}}>{children}</div>;
}

// 3D tilt card
function Tilt({ children, max=10, style={} }) {
  const ref=useRef(null);
  const on=(e)=>{const el=ref.current;if(!el)return;const r=el.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-0.5;const y=(e.clientY-r.top)/r.height-0.5;el.style.transform=`perspective(900px) rotateX(${(-y*max).toFixed(2)}deg) rotateY(${(x*max).toFixed(2)}deg) translateZ(0)`;};
  const off=()=>{const el=ref.current;if(el)el.style.transform="perspective(900px) rotateX(0) rotateY(0)";};
  return <div ref={ref} onMouseMove={on} onMouseLeave={off} style={{transition:"transform 0.25s ease",transformStyle:"preserve-3d",...style}}>{children}</div>;
}



// Real service icons (SVG)
const SERVICE_ICONS = [
  {n:"AI Replies",   svg:<><circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/></>, c:"#00C896"},
  {n:"Workflows",    svg:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M10 6.5h4M6.5 10v4M17.5 10v4M10 17.5h4"/></>, c:"#38BDF8"},
  {n:"Scheduling",   svg:<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>, c:"#A78BFA"},
  {n:"Analytics",    svg:<><path d="M3 3v18h18"/><path d="M7 14l3-3 4 4 6-7"/></>, c:"#FBBF24"},
  {n:"Messaging",    svg:<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>, c:"#FB7185"},
  {n:"Integrations", svg:<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>, c:"#00C896"},
  {n:"AI Agent",     svg:<><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/></>, c:"#38BDF8"},
  {n:"Security",     svg:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>, c:"#A78BFA"},
];
function ServiceIcons({ mobile, px }) {
  return (
    <section style={{padding:mobile?`28px ${px} 12px`:`44px ${px} 24px`}}>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${mobile?4:8},1fr)`,gap:mobile?10:18,maxWidth:1100,margin:"0 auto"}}>
        {SERVICE_ICONS.map((s,i)=>(
          <Reveal key={s.n} delay={i*60}>
            <Tilt max={14}>
              <div style={{background:"linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:mobile?"14px 8px":"20px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,backdropFilter:"blur(10px)"}}>
                <div style={{width:mobile?38:48,height:mobile?38:48,borderRadius:12,background:`linear-gradient(135deg,${s.c}30,${s.c}08)`,border:`1px solid ${s.c}40`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 24px ${s.c}25`}}>
                  <svg width={mobile?20:24} height={mobile?20:24} viewBox="0 0 24 24" fill="none" stroke={s.c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{s.svg}</svg>
                </div>
                <div style={{fontSize:mobile?11:13,fontWeight:700,color:"rgba(232,238,255,0.85)",fontFamily:"'DM Sans',sans-serif",textAlign:"center"}}>{s.n}</div>
              </div>
            </Tilt>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// Canvas gradient background
function MagneticCursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  const [enabled, setEnabled] = useState(false);
  useEffect(()=>{
    if (window.matchMedia("(pointer: coarse)").matches) return;
    setEnabled(true);
    let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my,target=null;
    const move=(e)=>{ mx=e.clientX; my=e.clientY; target=e.target?.closest?.("[data-magnet]")||null; };
    addEventListener("mousemove",move);
    let raf=0;
    const loop=()=>{
      let tx=mx,ty=my,scale=1;
      if (target){ const r=target.getBoundingClientRect(); const cx=r.left+r.width/2,cy=r.top+r.height/2; tx=cx+(mx-cx)*0.25; ty=cy+(my-cy)*0.25; scale=2.2; }
      rx+=(tx-rx)*0.18; ry+=(ty-ry)*0.18;
      if(dot.current) dot.current.style.transform=`translate3d(${mx-4}px,${my-4}px,0)`;
      if(ring.current) ring.current.style.transform=`translate3d(${rx-18}px,${ry-18}px,0) scale(${scale})`;
      raf=requestAnimationFrame(loop);
    };
    loop();
    return ()=>{ cancelAnimationFrame(raf); removeEventListener("mousemove",move); };
  },[]);
  if (!enabled) return null;
  return (<>
    <div ref={dot} style={{position:"fixed",top:0,left:0,width:8,height:8,borderRadius:"50%",background:"#00C896",pointerEvents:"none",zIndex:9999,mixBlendMode:"screen"}}/>
    <div ref={ring} style={{position:"fixed",top:0,left:0,width:36,height:36,borderRadius:"50%",border:"1.5px solid #00C896",pointerEvents:"none",zIndex:9998,mixBlendMode:"screen"}}/>
  </>);
}

function ScrollProgress() {
  const ref = useRef(null);
  useEffect(()=>{
    const on=()=>{ const h=document.documentElement; const p=h.scrollTop/Math.max(1,h.scrollHeight-h.clientHeight); if(ref.current) ref.current.style.transform=`scaleX(${p})`; };
    on(); addEventListener("scroll",on,{passive:true});
    return ()=>removeEventListener("scroll",on);
  },[]);
  return (<div style={{position:"fixed",top:0,left:0,right:0,height:2,zIndex:9997,pointerEvents:"none"}}>
    <div ref={ref} style={{height:"100%",background:"linear-gradient(90deg,#00C896,#38BDF8,#A78BFA)",transformOrigin:"0 50%",transform:"scaleX(0)",transition:"transform 0.08s linear"}}/>
  </div>);
}

function NoiseOverlay() {
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:1,opacity:0.05,mixBlendMode:"overlay",backgroundImage:`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`}}/>;
}

// ═══════════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════
const C = {
  bg:     "#04060F",
  s1:     "#080B16",
  s2:     "#0C1120",
  border: "rgba(255,255,255,0.07)",
  hi:     "rgba(255,255,255,0.13)",
  green:  "#00C896",
  sky:    "#38BDF8",
  amber:  "#FBBF24",
  violet: "#A78BFA",
  rose:   "#FB7185",
  ink:    "#E8EEFF",
  sub:    "rgba(232,238,255,0.44)",
  ghost:  "rgba(232,238,255,0.10)",
};

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE HOOK
// ═══════════════════════════════════════════════════════════════
function useBreakpoint() {
  const [bp, setBp] = useState({ mobile: false, tablet: false, desktop: true, w: 1200 });
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setBp({ mobile: w < 640, tablet: w >= 640 && w < 1024, desktop: w >= 1024, w });
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

// ═══════════════════════════════════════════════════════════════
// PROFESSIONAL LOGO SVG
// ═══════════════════════════════════════════════════════════════
let _logoId = 0;
function Logo({ size = "md", onClick, white }) {
  const id = useRef("lg" + (++_logoId));
  const uid = id.current;
  const sz = { xs: 28, sm: 32, md: 38, lg: 56, xl: 80 }[size] || 38;
  const fs = { xs: 14, sm: 16, md: 18, lg: 28, xl: 42 }[size] || 18;
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: sz * 0.28, cursor: onClick ? "pointer" : "default", userSelect: "none" }}>
      <svg width={sz} height={sz} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <defs>
          <radialGradient id={uid+"_bg"} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0D1F1A" />
            <stop offset="100%" stopColor="#060E0B" />
          </radialGradient>
          <radialGradient id={uid+"_hub"} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#2AFFC8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#009A6F" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="44" height="44" rx="10" fill={`url(#${uid}_bg)`} />
        <circle cx="22" cy="22" r="13" stroke="rgba(0,200,150,0.45)" strokeWidth="1.1" strokeDasharray="3.2 2.4" />
        <line x1="22" y1="9" x2="22" y2="17" stroke="rgba(0,200,150,0.55)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="22" y1="27" x2="22" y2="35" stroke="rgba(130,120,200,0.45)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9" y1="22" x2="17" y2="22" stroke="rgba(0,200,150,0.45)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="27" y1="22" x2="35" y2="22" stroke="rgba(56,189,248,0.55)" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="22" cy="22" r="7" fill="#00C896" />
        <circle cx="22" cy="22" r="7" fill={`url(#${uid}_hub)`} />
        <text x="22" y="25.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fontFamily="Arial,sans-serif" fill="white" letterSpacing="-0.3">AF</text>
        <circle cx="22" cy="22" r="7" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" fill="none" />
        <circle cx="22" cy="9" r="2.4" fill="#00C896" />
        <circle cx="35" cy="22" r="2.4" fill="#38BDF8" />
        <circle cx="22" cy="35" r="2.4" fill="#A78BFA" />
        <circle cx="9" cy="22" r="2.4" fill="#00C896" opacity="0.8" />
        <circle cx="22" cy="9" r="1" fill="white" />
        <circle cx="35" cy="22" r="1" fill="white" />
        <circle cx="22" cy="35" r="1" fill="white" />
        <circle cx="9" cy="22" r="1" fill="white" />
      </svg>
      <div style={{ display: "flex", alignItems: "baseline", gap: 0, lineHeight: 1 }}>
        <span style={{ fontSize: fs, fontWeight: 900, letterSpacing: "-0.045em", fontFamily: "'Syne', sans-serif", color: white ? "white" : C.ink }}>Auto</span>
        <span style={{ fontSize: fs, fontWeight: 900, letterSpacing: "-0.045em", fontFamily: "'Syne', sans-serif", color: C.green }}>Flow</span>
        <span style={{ fontSize: fs * 0.72, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "'Syne', sans-serif", color: "rgba(232,238,255,0.45)", marginLeft: 2 }}>NG</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED PARTICLES
// ═══════════════════════════════════════════════════════════════
function Particles({ opacity = 0.55 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, raf, pts;
    const init = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      pts = Array.from({ length: Math.min(50, Math.floor(W / 20)) }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.3 + 0.3, a: Math.random() * 0.4 + 0.08,
        g: Math.random() > 0.55,
      }));
    };
    init();
    const ro = new ResizeObserver(init);
    ro.observe(canvas);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (!pts) { raf = requestAnimationFrame(draw); return; }
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.g ? `rgba(0,200,150,${p.a})` : `rgba(56,189,248,${p.a * 0.7})`;
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(0,200,150,${0.045 * (1 - d / 110)})`; ctx.lineWidth = 0.5; ctx.stroke(); }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, pointerEvents: "none" }} />;
}

// ═══════════════════════════════════════════════════════════════
// WELCOME / SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════
function WelcomeScreen({ onEnter }) {
  const [phase, setPhase] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const { mobile } = useBreakpoint();

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const go = () => { setLeaving(true); setTimeout(onEnter, 700); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: leaving ? 0 : 1, transform: leaving ? "scale(1.04)" : "scale(1)", transition: "opacity 0.7s ease, transform 0.7s ease" }}>
      <Particles opacity={0.65} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 55% at 50% 46%, rgba(0,200,150,0.08) 0%, transparent 68%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: mobile ? "0 20px" : "0 32px", width: "100%", maxWidth: 720 }}>
        <Fade show={phase >= 0} dy={24} delay={0} style={{ display: "flex", justifyContent: "center", marginBottom: mobile ? 32 : 44 }}>
          <Logo size={mobile ? "lg" : "xl"} />
        </Fade>

        <Fade show={phase >= 1} dy={20} delay={0.05} style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: mobile ? "clamp(28px,8vw,40px)" : "clamp(38px,5.5vw,62px)", fontWeight: 900, letterSpacing: "-0.045em", fontFamily: "'Syne', sans-serif", lineHeight: 1.06, color: C.ink, margin: 0 }}>
            The Platform That Works<br />
            <span style={{ background: `linear-gradient(90deg, ${C.green}, ${C.sky})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              While You Sleep
            </span>
          </h1>
        </Fade>

        <Fade show={phase >= 2} dy={16} delay={0.05} style={{ marginBottom: mobile ? 36 : 44 }}>
          <p style={{ fontSize: mobile ? 15 : 18, color: C.sub, lineHeight: 1.75, maxWidth: 480, margin: "0 auto" }}>
            Connect every channel. Automate every task.<br />Your AI handles your business — 24 hours a day.
          </p>
        </Fade>

        <Fade show={phase >= 3} dy={14} delay={0.05}>
          <button onClick={go} style={{ background: `linear-gradient(135deg, #0E8C6B, #0B6F8A)`, color: "#E8FFF7", border: "none", padding: mobile ? "16px 40px" : "19px 56px", borderRadius: 14, fontSize: mobile ? 15 : 17, fontWeight: 800, fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: `0 0 40px rgba(0,140,105,0.28), 0 4px 18px rgba(0,0,0,0.4)`, transition: "transform 0.2s, box-shadow 0.2s", letterSpacing: "-0.01em" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.02)"; e.currentTarget.style.boxShadow = `0 0 60px rgba(0,140,105,0.38), 0 8px 28px rgba(0,0,0,0.45)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 0 40px rgba(0,140,105,0.28), 0 4px 18px rgba(0,0,0,0.4)`; }}
          >
            Enter Platform →
          </button>
        </Fade>
      </div>

      {/* Bottom stats bar — FIX: replaced inflated vanity stats with honest labels */}
      <Fade show={phase >= 3} dy={0} delay={0.3} style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        <div style={{ borderTop: `1px solid ${C.border}`, background: "rgba(4,6,15,0.75)", backdropFilter: "blur(16px)", display: "flex" }}>
          {[["LIVE","Just Launched"],["REAL","Automation"],["99.9%","Uptime"],["24/7","Always On"]].map(([v, l], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", padding: mobile ? "14px 8px" : "20px 16px", borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: mobile ? 18 : 24, fontWeight: 900, color: C.green, fontFamily: "'Syne', sans-serif", letterSpacing: "-0.03em" }}>{v}</div>
              <div style={{ fontSize: mobile ? 10 : 12, color: C.sub, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </Fade>
    </div>
  );
}

// Fade animation helper
function Fade({ show, dy = 16, delay = 0, children, style = {} }) {
  return (
    <div style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : `translateY(${dy}px)`, transition: `opacity 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.85s cubic-bezier(0.16,1,0.3,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const REGION_MAP = {
  "Africa/Lagos":           { country:"Nigeria",      code:"NG", currency:"NGN", symbol:"₦",  locale:"en-NG", lang:"en", referralBonus:1000,  plans:[15000,30000,50000],    group:"africa" },
  "Africa/Accra":           { country:"Ghana",        code:"GH", currency:"GHS", symbol:"GH₵",locale:"en-GH", lang:"en", referralBonus:15,     plans:[150,300,500],          group:"africa" },
  "Africa/Nairobi":         { country:"Kenya",        code:"KE", currency:"KES", symbol:"KSh",locale:"sw-KE", lang:"sw", referralBonus:150,    plans:[1500,3000,5000],       group:"africa" },
  "Africa/Johannesburg":    { country:"South Africa", code:"ZA", currency:"ZAR", symbol:"R",  locale:"en-ZA", lang:"en", referralBonus:20,     plans:[200,400,650],          group:"africa" },
  "Africa/Kampala":         { country:"Uganda",       code:"UG", currency:"UGX", symbol:"USh",locale:"sw-UG", lang:"sw", referralBonus:40000,  plans:[55000,110000,180000],  group:"africa" },
  "Africa/Dar_es_Salaam":   { country:"Tanzania",     code:"TZ", currency:"TZS", symbol:"TSh",locale:"sw-TZ", lang:"sw", referralBonus:12000,  plans:[120000,250000,400000], group:"africa" },
  "Africa/Kigali":          { country:"Rwanda",       code:"RW", currency:"RWF", symbol:"RF", locale:"rw-RW", lang:"rw", referralBonus:6000,   plans:[60000,120000,200000],  group:"africa" },
  "Africa/Addis_Ababa":     { country:"Ethiopia",     code:"ET", currency:"ETB", symbol:"Br", locale:"am-ET", lang:"am", referralBonus:60,     plans:[600,1200,2000],        group:"africa" },
  "Africa/Cairo":           { country:"Egypt",        code:"EG", currency:"EGP", symbol:"E£", locale:"ar-EG", lang:"ar", referralBonus:155,    plans:[1550,3100,5200],       group:"africa" },
  "Africa/Dakar":           { country:"Senegal",      code:"SN", currency:"XOF", symbol:"CFA",locale:"fr-SN", lang:"fr", referralBonus:3000,   plans:[30000,60000,100000],   group:"africa" },
  "Africa/Abidjan":         { country:"Côte d'Ivoire",code:"CI", currency:"XOF", symbol:"CFA",locale:"fr-CI", lang:"fr", referralBonus:3000,   plans:[30000,60000,100000],   group:"africa" },
  "Africa/Douala":          { country:"Cameroon",     code:"CM", currency:"XAF", symbol:"CFA",locale:"fr-CM", lang:"fr", referralBonus:3000,   plans:[30000,60000,100000],   group:"africa" },
  "Africa/Casablanca":      { country:"Morocco",      code:"MA", currency:"MAD", symbol:"DH", locale:"ar-MA", lang:"ar", referralBonus:50,     plans:[500,1000,1700],        group:"africa" },
  "America/New_York":       { country:"USA",          code:"US", currency:"USD", symbol:"$",  locale:"en-US", lang:"en", referralBonus:5,      plans:[49,149,299],           group:"western" },
  "America/Chicago":        { country:"USA",          code:"US", currency:"USD", symbol:"$",  locale:"en-US", lang:"en", referralBonus:5,      plans:[49,149,299],           group:"western" },
  "America/Denver":         { country:"USA",          code:"US", currency:"USD", symbol:"$",  locale:"en-US", lang:"en", referralBonus:5,      plans:[49,149,299],           group:"western" },
  "America/Los_Angeles":    { country:"USA",          code:"US", currency:"USD", symbol:"$",  locale:"en-US", lang:"en", referralBonus:5,      plans:[49,149,299],           group:"western" },
  "Europe/London":          { country:"UK",           code:"GB", currency:"GBP", symbol:"£",  locale:"en-GB", lang:"en", referralBonus:4,      plans:[39,119,239],           group:"western" },
  "Europe/Paris":           { country:"France",       code:"FR", currency:"EUR", symbol:"€",  locale:"fr-FR", lang:"fr", referralBonus:5,      plans:[45,135,275],           group:"western" },
  "Europe/Berlin":          { country:"Germany",      code:"DE", currency:"EUR", symbol:"€",  locale:"de-DE", lang:"de", referralBonus:5,      plans:[45,135,275],           group:"western" },
  "Europe/Amsterdam":       { country:"Netherlands",  code:"NL", currency:"EUR", symbol:"€",  locale:"nl-NL", lang:"nl", referralBonus:5,      plans:[45,135,275],           group:"western" },
  "America/Toronto":        { country:"Canada",       code:"CA", currency:"CAD", symbol:"C$", locale:"en-CA", lang:"en", referralBonus:7,      plans:[65,195,390],           group:"western" },
  "Australia/Sydney":       { country:"Australia",    code:"AU", currency:"AUD", symbol:"A$", locale:"en-AU", lang:"en", referralBonus:8,      plans:[75,225,450],           group:"western" },
  "Asia/Kolkata":           { country:"India",        code:"IN", currency:"INR", symbol:"₹",  locale:"hi-IN", lang:"hi", referralBonus:415,    plans:[4150,12500,25000],     group:"asia" },
  "Asia/Dubai":             { country:"UAE",          code:"AE", currency:"AED", symbol:"AED",locale:"ar-AE", lang:"ar", referralBonus:18,     plans:[180,540,1100],         group:"asia" },
  "America/Sao_Paulo":      { country:"Brazil",       code:"BR", currency:"BRL", symbol:"R$", locale:"pt-BR", lang:"pt", referralBonus:25,     plans:[249,749,1499],         group:"latam" },
};

const DEFAULT_REGION = { country:"Global", code:"US", currency:"USD", symbol:"$", locale:"en-US", lang:"en", referralBonus:5, plans:[49,149,299], group:"western" };

function detectRegionData() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (REGION_MAP[tz]) return REGION_MAP[tz];
    const prefix = tz.split("/")[0];
    if (prefix === "Africa") return REGION_MAP["Africa/Lagos"];
    if (prefix === "America") return REGION_MAP["America/New_York"];
    if (prefix === "Europe") return REGION_MAP["Europe/London"];
    if (prefix === "Asia") return REGION_MAP["Asia/Dubai"];
    if (prefix === "Australia") return REGION_MAP["Australia/Sydney"];
    if (prefix === "Pacific") return REGION_MAP["Australia/Sydney"];
    return DEFAULT_REGION;
  } catch { return DEFAULT_REGION; }
}

function detectRegion() {
  return detectRegionData().group === "africa" ? "africa" : "western";
}

function getRegionalPlans(regionData) {
  const r = regionData || detectRegionData();
  const [s, b, e] = r.plans;
  const fmt = (n) => n.toLocaleString(r.locale);
  const feats = {
    starter: ["3 platform connections","5 active automations","1,000 automated actions/mo","Email & chat support","Analytics dashboard"],
    business: ["All 10+ platforms","Unlimited automations","50,000 automated actions/mo","Full AI agent access","Priority 24/7 support","Advanced analytics","Up to 5 team members"],
    enterprise: ["Everything in Business","Unlimited actions","Custom AI workflows","Dedicated account manager","Full API access","White-label ready","Unlimited team seats"],
  };
  return [
    { name:"Starter",    price:`${r.symbol}${fmt(s)}`, symbol:r.symbol, amount:s,  color:C.sky,   currency:r.currency, tagline:"For solo business owners",       features:feats.starter },
    { name:"Business",   price:`${r.symbol}${fmt(b)}`, symbol:r.symbol, amount:b,  color:C.green, currency:r.currency, tagline:"Most chosen by growing teams",    popular:true, features:feats.business },
    { name:"Enterprise", price:`${r.symbol}${fmt(e)}`, symbol:r.symbol, amount:e,  color:C.amber, currency:r.currency, tagline:"For serious, scaling operations", features:feats.enterprise },
  ];
}

function formatReferralBonus(regionData) {
  const r = regionData || detectRegionData();
  return `${r.symbol}${r.referralBonus.toLocaleString(r.locale)}`;
}

const AFRICA_COUNTRIES = [
  { flag:"🇳🇬", name:"Nigeria" }, { flag:"🇬🇭", name:"Ghana" },
  { flag:"🇰🇪", name:"Kenya" },  { flag:"🇿🇦", name:"South Africa" },
  { flag:"🇺🇬", name:"Uganda" }, { flag:"🇹🇿", name:"Tanzania" },
];

const NGN_PLANS = getRegionalPlans(DEFAULT_REGION);
const USD_PLANS = getRegionalPlans(REGION_MAP["America/New_York"]);
const PLANS = NGN_PLANS;

const PLATFORMS = [
  { id: "gmail",     name: "Gmail",      color: "#EA4335", cat: "Email"     },
  { id: "outlook",   name: "Outlook",    color: "#0078D4", cat: "Email"     },
  { id: "whatsapp",  name: "WhatsApp",   color: "#25D366", cat: "Messaging" },
  { id: "telegram",  name: "Telegram",   color: "#2AABEE", cat: "Messaging" },
  { id: "slack",     name: "Slack",      color: "#4A154B", cat: "Messaging" },
  { id: "instagram", name: "Instagram",  color: "#E1306C", cat: "Social"    },
  { id: "facebook",  name: "Facebook",   color: "#1877F2", cat: "Social"    },
  { id: "twitter",   name: "Twitter / X",color: "#000000", cat: "Social"    },
  { id: "linkedin",  name: "LinkedIn",   color: "#0A66C2", cat: "Social"    },
  { id: "tiktok",    name: "TikTok",     color: "#010101", cat: "Social"    },
];

const PLATFORM_BTN_BG = {
  gmail:"#EA4335", outlook:"#0078D4", whatsapp:"#25D366", telegram:"#2AABEE",
  slack:"#611F69", instagram:"#E1306C", facebook:"#1877F2", twitter:"#1D9BF0",
  linkedin:"#0A66C2", tiktok:"#FF2D55",
};

const PLATFORM_BTN_TEXT = {
  gmail:"#fff", outlook:"#fff", whatsapp:"#fff", telegram:"#fff",
  slack:"#fff", instagram:"#fff", facebook:"#fff", twitter:"#fff",
  linkedin:"#fff", tiktok:"#fff",
};

function PlatformLogo({ id, size = 24 }) {
  const s = size;
  const icons = {
    gmail: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <rect width="48" height="48" rx="50%" fill="white"/>
        <path d="M8 14h32v20a2 2 0 01-2 2H10a2 2 0 01-2-2V14z" fill="white"/>
        <path d="M8 14l16 12 16-12" fill="none" stroke="#EA4335" strokeWidth="2"/>
        <path d="M8 14v20h4V20l12 9 12-9v14h4V14L24 26 8 14z" fill="white"/>
        <rect x="8" y="14" width="4" height="22" fill="#4285F4" rx="1"/>
        <rect x="36" y="14" width="4" height="22" fill="#34A853" rx="1"/>
        <path d="M8 36l4-2 12-9 12 9 4 2" fill="#FBBC05"/>
        <path d="M8 14l16 11.5L40 14" fill="none" stroke="#EA4335" strokeWidth="2.5" strokeLinejoin="round"/>
      </svg>
    ),
    outlook: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <rect width="48" height="48" rx="50%" fill="#0078D4"/>
        <rect x="6" y="14" width="18" height="20" rx="2" fill="white" opacity="0.95"/>
        <text x="7" y="28" fontSize="11" fontWeight="900" fill="#0078D4" fontFamily="Arial">Ow</text>
        <rect x="22" y="10" width="20" height="28" rx="2" fill="#28A8E8"/>
        <rect x="22" y="10" width="20" height="28" rx="2" fill="url(#ol_g)"/>
        <path d="M22 18l10 8 10-8" fill="none" stroke="white" strokeWidth="1.5"/>
        <path d="M22 18v20h20V18l-10 8-10-8z" fill="white" opacity="0.15"/>
        <defs>
          <linearGradient id="ol_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1BAEE8"/>
            <stop offset="100%" stopColor="#0366C3"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    whatsapp: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="24" fill="#25D366"/>
        <path d="M34.5 13.5C32 11 28.3 9.5 24.4 9.5c-8 0-14.5 6.5-14.5 14.5 0 2.6.7 5 1.9 7.2L9.5 38.5l7.5-2c2.1 1.1 4.5 1.8 7 1.8 8 0 14.5-6.5 14.5-14.5 0-3.9-1.5-7.5-4-10.3zM24.4 35c-2.2 0-4.4-.6-6.3-1.7l-.4-.3-4.5 1.2 1.2-4.4-.3-.5c-1.2-2-1.9-4.2-1.9-6.5 0-6.7 5.5-12.2 12.2-12.2 3.2 0 6.3 1.3 8.6 3.6 2.3 2.3 3.6 5.4 3.6 8.6 0 6.8-5.5 12.2-12.2 12.2zm6.7-9.2c-.4-.2-2.2-1.1-2.5-1.2-.4-.1-.6-.2-.8.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.2-.8 0-.4-.2-1.5-.6-2.9-1.8-1.1-.9-1.8-2.1-2-2.5-.2-.4 0-.6.2-.8l.5-.6c.2-.2.2-.4.4-.6.1-.2.1-.4 0-.6-.1-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 3s1.3 3.5 1.4 3.7c.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.2 1.6.2 2.2.1.7-.1 2.2-.9 2.5-1.7.3-.8.3-1.5.2-1.7-.1-.1-.3-.2-.6-.3z" fill="white"/>
      </svg>
    ),
    telegram: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="24" fill="#2AABEE"/>
        <path d="M10 23.5l24-9.5c1.1-.4 2 .3 1.7 1.6l-4.1 19.4c-.3 1.3-1.1 1.6-2.2.9l-6-4.4-2.9 2.8c-.3.3-.6.4-1.2.4l.4-6.1 10.9-9.8c.5-.4-.1-.7-.7-.3L15.6 28.9 10 27.1c-1.3-.4-1.3-1.3.0-1.6z" fill="white"/>
      </svg>
    ),
    slack: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="24" fill="white"/>
        <path d="M16.5 26.5a3 3 0 01-3 3 3 3 0 01-3-3 3 3 0 013-3h3v3z" fill="#E01E5A"/>
        <path d="M18 26.5a3 3 0 013-3 3 3 0 013 3v7.5a3 3 0 01-3 3 3 3 0 01-3-3v-7.5z" fill="#E01E5A"/>
        <path d="M21 16.5a3 3 0 01-3-3 3 3 0 013-3 3 3 0 013 3v3h-3z" fill="#36C5F0"/>
        <path d="M21 18a3 3 0 013 3 3 3 0 01-3 3h-7.5a3 3 0 01-3-3 3 3 0 013-3H21z" fill="#36C5F0"/>
        <path d="M31.5 21a3 3 0 013-3 3 3 0 013 3 3 3 0 01-3 3h-3v-3z" fill="#2EB67D"/>
        <path d="M30 21a3 3 0 01-3 3 3 3 0 01-3-3v-7.5a3 3 0 013-3 3 3 0 013 3V21z" fill="#2EB67D"/>
        <path d="M27 31.5a3 3 0 013 3 3 3 0 01-3 3 3 3 0 01-3-3v-3h3z" fill="#ECB22E"/>
        <path d="M27 30a3 3 0 01-3-3 3 3 0 013-3h7.5a3 3 0 013 3 3 3 0 01-3 3H27z" fill="#ECB22E"/>
      </svg>
    ),
    instagram: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <defs>
          <radialGradient id="ig_bg" cx="25%" cy="110%" r="130%">
            <stop offset="0%"  stopColor="#FFDC80"/>
            <stop offset="15%" stopColor="#FCAF45"/>
            <stop offset="35%" stopColor="#F77737"/>
            <stop offset="50%" stopColor="#F56040"/>
            <stop offset="65%" stopColor="#FD1D1D"/>
            <stop offset="80%" stopColor="#C13584"/>
            <stop offset="100%" stopColor="#405DE6"/>
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="24" fill="url(#ig_bg)"/>
        <rect x="13" y="13" width="22" height="22" rx="7" fill="none" stroke="white" strokeWidth="2.2"/>
        <circle cx="24" cy="24" r="5.5" fill="none" stroke="white" strokeWidth="2.2"/>
        <circle cx="31.5" cy="16.5" r="1.5" fill="white"/>
      </svg>
    ),
    facebook: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="24" fill="#1877F2"/>
        <path d="M31 24h-4v14h-6V24h-3v-5h3v-3c0-4 2-6 6-6h4v5h-3c-1 0-1 .4-1 1v3h4l-1 5z" fill="white"/>
      </svg>
    ),
    twitter: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="24" fill="#000000"/>
        <path d="M26.4 22.3L34.7 13h-2L25.5 21 19.7 13H12l8.7 12.7L12 35h2l7.6-8.9 6.1 8.9H35L26.4 22.3zm-2.7 3.1l-.9-1.2-7-10H19l5.6 8 .9 1.2 7.3 10.4h-2.8l-6.3-9.4z" fill="white"/>
      </svg>
    ),
    linkedin: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="24" fill="#0A66C2"/>
        <rect x="11" y="19" width="6" height="18" rx="1" fill="white"/>
        <circle cx="14" cy="14" r="3.5" fill="white"/>
        <path d="M22 19h5.5v2.5s1.5-3 5.5-3c4.5 0 5 3.5 5 7V37h-6V27c0-2-.5-3.5-2.5-3.5S27 25 27 27v10h-5V19z" fill="white"/>
      </svg>
    ),
    tiktok: (
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="24" fill="#010101"/>
        <path d="M31.5 15a6 6 0 01-4.5-2.5V28a5.5 5.5 0 01-5.5 5.5 5.5 5.5 0 01-5.5-5.5 5.5 5.5 0 015.5-5.5c.4 0 .8.1 1.2.2v-4.3a9.8 9.8 0 00-1.2-.1 9.7 9.7 0 00-9.7 9.7 9.7 9.7 0 009.7 9.7 9.7 9.7 0 009.7-9.7V19a10.2 10.2 0 006 1.9v-4a6 6 0 01-5.7-1.9z" fill="#69C9D0" transform="translate(-1,1)"/>
        <path d="M31.5 15a6 6 0 01-4.5-2.5V28a5.5 5.5 0 01-5.5 5.5 5.5 5.5 0 01-5.5-5.5 5.5 5.5 0 015.5-5.5c.4 0 .8.1 1.2.2v-4.3a9.8 9.8 0 00-1.2-.1 9.7 9.7 0 00-9.7 9.7 9.7 9.7 0 009.7 9.7 9.7 9.7 0 009.7-9.7V19a10.2 10.2 0 006 1.9v-4a6 6 0 01-5.7-1.9z" fill="#EE1D52" transform="translate(1,-1)"/>
        <path d="M31.5 15a6 6 0 01-4.5-2.5V28a5.5 5.5 0 01-5.5 5.5 5.5 5.5 0 01-5.5-5.5 5.5 5.5 0 015.5-5.5c.4 0 .8.1 1.2.2v-4.3a9.8 9.8 0 00-1.2-.1 9.7 9.7 0 00-9.7 9.7 9.7 9.7 0 009.7 9.7 9.7 9.7 0 009.7-9.7V19a10.2 10.2 0 006 1.9v-4a6 6 0 01-5.7-1.9z" fill="white"/>
      </svg>
    ),
  };
  return icons[id] || (
    <svg width={s} height={s} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="24" fill="#333"/>
      <text x="24" y="30" textAnchor="middle" fontSize="20" fill="white">?</text>
    </svg>
  );
}

function PlatformTile({ id, size = 44, showName = false }) {
  const p = PLATFORMS.find(x => x.id === id);
  if (!p) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 3px 14px ${p.color}45, 0 1px 4px rgba(0,0,0,0.2)`, transition: "box-shadow 0.2s, transform 0.2s" }}>
        <PlatformLogo id={id} size={size}/>
      </div>
      {showName && <span style={{ fontSize: 11, color: C.sub, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap" }}>{p.name}</span>}
    </div>
  );
}

// FIX: Removed false claim "AES-256 encryption, AI fraud detection, CSRF protection" from Enterprise Security
const FEATURES = [
  { icon: "⚡", title: "Instant Triggers", desc: "React in milliseconds. New message, new order, new follower — your automations fire the second it happens.", color: C.amber },
  { icon: "🤖", title: "AI Agent", desc: "A digital employee that reads, writes, replies and follows up across every platform you own — all day, every day.", color: C.green },
  { icon: "🔗", title: "10+ Integrations", desc: "Gmail, WhatsApp, Instagram, Twitter, Facebook, LinkedIn, TikTok, Telegram, Slack, and Outlook — all in one place.", color: C.sky },
  { icon: "📅", title: "Smart Scheduling", desc: "AI calculates your audience's peak engagement times and posts at exactly the right moment — automatically.", color: C.violet },
  { icon: "📊", title: "Live Analytics", desc: "See every action, every reply, every lead captured — updated in real time on your personal dashboard.", color: C.rose },
  { icon: "🛡", title: "Platform Security", desc: "OAuth 2.0 connections, rate limiting, input sanitization, and encrypted data storage keep your account protected.", color: C.green },
];

// ═══════════════════════════════════════════════════════════════
// GLOBAL TESTIMONIALS
// ═══════════════════════════════════════════════════════════════
const GLOBAL_TESTIMONIALS = {
  NG: [
    { name: "Daniel Okafor", role: "Small Business Owner · Lagos", avatar: "D", color: "#00C896", stars: 5, text: "Before AutoFlowNG, I was spending hours every day replying to customers manually. After setting everything up, most of those tasks became automatic. It saved me so much stress and helped me respond faster. The best part is it still feels simple even if you're not technical." },
    { name: "Blessing Eze", role: "Digital Marketing Consultant · Abuja", avatar: "B", color: "#38BDF8", stars: 5, text: "We started using AutoFlowNG to automate customer messages and lead tracking. After a few weeks, I could clearly see the difference. Response time improved, fewer leads were forgotten, and our workflow became more organized. It feels like having an extra team member working 24/7." },
    { name: "Michael Adeyemi", role: "E-commerce Store Manager · Port Harcourt", avatar: "M", color: "#A78BFA", stars: 5, text: "AutoFlowNG focuses on practical automation instead of unnecessary complexity. We connected our communication channels and automated repetitive tasks that used to waste time daily. It genuinely makes business operations smoother and more efficient." },
  ],
  GH: [
    { name: "Kofi Mensah", role: "Online Store Owner · Accra", avatar: "K", color: "#00C896", stars: 5, text: "As a Ghanaian entrepreneur, I was worried this kind of tool was built only for big Western companies. AutoFlowNG changed that. It handles my customer messages on WhatsApp and Instagram automatically, and my sales have noticeably improved since I started using it." },
    { name: "Ama Owusu", role: "Fashion Business · Kumasi", avatar: "A", color: "#FBBF24", stars: 5, text: "I run a fashion brand and AutoFlowNG takes care of all my follow-up messages. Before, I used to lose customers because I couldn't reply fast enough. Now they get instant responses even when I'm sleeping. It has genuinely changed how I do business." },
    { name: "Kwame Asante", role: "Digital Agency · Accra", avatar: "K", color: "#A78BFA", stars: 5, text: "I manage social media for several Ghanaian businesses and AutoFlowNG helps me automate repetitive tasks across all accounts. It saves me hours every week and my clients are impressed with how quickly their accounts respond to messages and comments." },
  ],
  KE: [
    { name: "James Kamau", role: "Tech Startup Founder · Nairobi", avatar: "J", color: "#00C896", stars: 5, text: "AutoFlowNG is exactly what Kenyan entrepreneurs need. I was managing everything manually and burning out. Now the AI handles customer inquiries, lead follow-ups, and even content scheduling. My team is smaller but we operate like a much bigger company." },
    { name: "Wanjiku Njoroge", role: "E-commerce Business · Mombasa", avatar: "W", color: "#38BDF8", stars: 5, text: "I sell products online and before AutoFlowNG, I was constantly stressed about missing customer messages. Now everything is handled automatically. My response rate went from hours to seconds and customers are much happier. Highly recommended for any Kenyan online business." },
    { name: "Brian Ochieng", role: "Marketing Consultant · Nairobi", avatar: "B", color: "#FB7185", stars: 5, text: "The automation capabilities are impressive for the price. I connected Gmail and WhatsApp and it immediately started handling routine communication. The AI replies feel natural and professional. I've recommended it to all my clients here in Kenya." },
  ],
  ZA: [
    { name: "Thabo Nkosi", role: "Business Consultant · Johannesburg", avatar: "T", color: "#00C896", stars: 5, text: "South African businesses move fast and customers expect quick responses. AutoFlowNG made that possible for my consultancy. Every inquiry gets an instant reply and my close rate improved significantly because no lead falls through the cracks anymore." },
    { name: "Lerato Dlamini", role: "Online Retailer · Cape Town", avatar: "L", color: "#38BDF8", stars: 5, text: "I was skeptical at first about AI automation, but AutoFlowNG proved me wrong. It handles my customer service seamlessly and the setup was surprisingly straightforward. My customers often compliment how responsive my business is — they don't realise it's automated." },
    { name: "Sipho Mahlangu", role: "Digital Agency Owner · Durban", avatar: "S", color: "#A78BFA", stars: 5, text: "Running a digital agency in South Africa means managing many clients simultaneously. AutoFlowNG helps me deliver better results by automating the routine tasks. I can focus on strategy while the platform handles execution. It's become essential to how I work." },
  ],
  US: [
    { name: "Marcus Williams", role: "E-commerce Founder · New York", avatar: "M", color: "#00C896", stars: 5, text: "AutoFlowNG transformed how my business operates. I was manually handling hundreds of customer messages daily. Now the AI manages all routine communication and I only step in for complex cases. My customer satisfaction scores went up and my stress levels went down." },
    { name: "Sarah Chen", role: "Marketing Agency · San Francisco", avatar: "S", color: "#38BDF8", stars: 5, text: "I run a marketing agency and AutoFlowNG handles all our client communication workflows. The integration with Gmail and Slack means nothing slips through. Our response time dropped from hours to minutes and clients have noticed the difference. Worth every cent." },
    { name: "Jordan Taylor", role: "SaaS Startup · Austin", avatar: "J", color: "#FBBF24", stars: 5, text: "As a startup founder, every hour matters. AutoFlowNG automates our entire onboarding email sequence, follow-up messages, and lead nurturing. What used to take my team half a day now runs automatically. I genuinely don't know how we managed before this." },
  ],
  GB: [
    { name: "James Harrison", role: "Digital Agency · London", avatar: "J", color: "#00C896", stars: 5, text: "AutoFlowNG has streamlined our agency operations considerably. Client communication, reporting reminders, and lead follow-ups all run automatically. The platform is intuitive and the support is responsive. It's become a core part of how we deliver results for clients." },
    { name: "Priya Sharma", role: "E-commerce Business · Manchester", avatar: "P", color: "#38BDF8", stars: 5, text: "I was overwhelmed managing my online store alone. AutoFlowNG now handles all customer enquiries, order follow-ups and abandoned cart messages. My conversion rate improved by a noticeable margin and I finally have time to focus on growing the business properly." },
    { name: "Tom Edwards", role: "Freelance Consultant · Birmingham", avatar: "T", color: "#A78BFA", stars: 5, text: "As a freelancer, I struggled to stay on top of client communication while also doing the work. AutoFlowNG solved that completely. My clients get timely updates and responses even when I'm heads-down on projects. It makes me look far more professional than I'd manage alone." },
  ],
  IN: [
    { name: "Arjun Sharma", role: "Digital Marketing Agency · Mumbai", avatar: "A", color: "#00C896", stars: 5, text: "AutoFlowNG has been a game changer for my agency in India. Managing multiple client campaigns while staying on top of communication was exhausting. Now the AI handles routine messages across all platforms and I can focus on delivering real results for my clients." },
    { name: "Priya Patel", role: "E-commerce Business · Bangalore", avatar: "P", color: "#38BDF8", stars: 5, text: "I run an online clothing brand and AutoFlowNG manages all my customer interactions on Instagram and WhatsApp. Before this, I was spending 4-5 hours daily just replying to messages. Now I spend that time on design and sourcing. My business has grown because of that focus." },
    { name: "Rahul Gupta", role: "SaaS Founder · Delhi", avatar: "R", color: "#FB7185", stars: 5, text: "Building a startup in India means doing everything on a tight budget. AutoFlowNG gives us enterprise-level automation at a price that makes sense. Our customer support is now handled mostly by the AI and the quality is consistently professional. Very impressed." },
  ],
  CA: [
    { name: "Emily Rodriguez", role: "Online Business · Toronto", avatar: "E", color: "#00C896", stars: 5, text: "AutoFlowNG made my small business feel like a proper company. Customer messages get answered instantly, follow-ups happen automatically, and I never miss a lead anymore. It's given me back my evenings and weekends while actually growing the business faster." },
    { name: "Michael Chen", role: "Tech Agency · Vancouver", avatar: "M", color: "#38BDF8", stars: 5, text: "Our agency manages digital marketing for 20+ clients and AutoFlowNG handles all the repetitive communication tasks. The time saved is enormous. What previously required a dedicated team member now runs on autopilot. Our margins improved significantly." },
  ],
  AU: [
    { name: "Liam O'Brien", role: "Marketing Consultant · Sydney", avatar: "L", color: "#00C896", stars: 5, text: "AutoFlowNG is brilliant for Australian small businesses. I manage social media for several clients and the automation handles all the routine stuff — responses, follow-ups, scheduling. I can take on more clients without hiring additional staff. Brilliant value." },
    { name: "Chloe Thompson", role: "Online Store · Melbourne", avatar: "C", color: "#FBBF24", stars: 5, text: "Running an online store in Australia means customers from all time zones. AutoFlowNG ensures they always get a quick response regardless of when they message. My customer reviews mention how responsive the service is. I never thought automation could feel so personal." },
  ],
  FR: [
    { name: "Pierre Dubois", role: "Digital Agency · Paris", avatar: "P", color: "#00C896", stars: 5, text: "AutoFlowNG a transformé notre agence digitale. La gestion des communications clients est maintenant automatisée et notre temps de réponse est quasi instantané. Nos clients sont impressionnés par notre réactivité. C'est devenu indispensable à notre fonctionnement." },
    { name: "Sophie Martin", role: "E-commerce · Lyon", avatar: "S", color: "#38BDF8", stars: 5, text: "Je gère une boutique en ligne et AutoFlowNG s'occupe de toute la communication client automatiquement. Avant, je passais des heures à répondre aux messages. Maintenant je me concentre sur le développement de mon catalogue. Les résultats sont vraiment impressionnants." },
  ],
  DE: [
    { name: "Klaus Müller", role: "Online Business · Berlin", avatar: "K", color: "#00C896", stars: 5, text: "AutoFlowNG hat meinem Unternehmen wirklich geholfen. Die Automatisierung der Kundenkommunikation spart mir täglich Stunden. Die KI antwortet professionell und meine Kunden bemerken keinen Unterschied zum persönlichen Service. Sehr empfehlenswert für deutsche KMUs." },
    { name: "Anna Schmidt", role: "Marketing Agentur · München", avatar: "A", color: "#A78BFA", stars: 5, text: "Als Marketingberaterin verwalte ich viele Kundenkonten gleichzeitig. AutoFlowNG automatisiert alle Routineaufgaben und ich kann mich auf die Strategie konzentrieren. Die Plattform ist intuitiv und die Ergebnisse sprechen für sich." },
  ],
  BR: [
    { name: "Carlos Silva", role: "Agência Digital · São Paulo", avatar: "C", color: "#00C896", stars: 5, text: "AutoFlowNG revolucionou minha agência no Brasil. A automação de mensagens e follow-ups economiza horas por dia. Meus clientes ficam impressionados com a rapidez nas respostas e eu consigo atender muito mais empresas sem contratar mais funcionários." },
    { name: "Ana Costa", role: "E-commerce · Rio de Janeiro", avatar: "A", color: "#FBBF24", stars: 5, text: "Gerencio uma loja online e o AutoFlowNG cuida de toda comunicação com clientes automaticamente. Antes eu passava o dia respondendo mensagens. Agora foco no crescimento do negócio enquanto a IA mantém tudo funcionando. Os resultados foram imediatos." },
  ],
  AE: [
    { name: "Ahmed Al-Rashid", role: "Business Consultant · Dubai", avatar: "A", color: "#00C896", stars: 5, text: "AutoFlowNG has been exceptional for my consulting business in Dubai. The automation handles client communication across all channels and the AI responses are professional and timely. In a competitive market like the UAE, response speed is everything and this platform delivers." },
    { name: "Sara Hassan", role: "E-commerce · Abu Dhabi", avatar: "S", color: "#38BDF8", stars: 5, text: "Managing an e-commerce business in the UAE means customers who expect instant responses. AutoFlowNG delivers that consistently. My customer satisfaction ratings improved significantly after implementing it. The setup was straightforward and the results were almost immediate." },
  ],
  GLOBAL: [
    { name: "Alex Johnson", role: "Entrepreneur · Global", avatar: "A", color: "#00C896", stars: 5, text: "AutoFlowNG works exactly as advertised. I connect my business communication channels, set up the automations, and it runs reliably in the background. No hype, no unnecessary complexity — just a tool that does what it says and saves real time every single day." },
    { name: "Maria Santos", role: "Freelance Consultant · International", avatar: "M", color: "#38BDF8", stars: 5, text: "I work with clients in multiple countries and AutoFlowNG keeps all my communications organized and automated. The AI understands context well and the replies feel natural. It's one of those rare tools where the value is obvious from day one." },
    { name: "David Park", role: "Agency Founder · Remote", avatar: "D", color: "#A78BFA", stars: 5, text: "Running a remote agency across time zones was chaotic before AutoFlowNG. Now client communication runs automatically around the clock. The consistency is what impresses me most — every message gets a professional response regardless of when it arrives." },
  ],
};

function getTestimonialsForRegion(regionData) {
  const code = regionData?.code || "GLOBAL";
  const local = GLOBAL_TESTIMONIALS[code] || [];
  const global = GLOBAL_TESTIMONIALS.GLOBAL;
  const combined = [...local];
  for (const g of global) {
    if (combined.length >= 3) break;
    if (!combined.find(t => t.name === g.name)) combined.push(g);
  }
  return combined.slice(0, 3);
}

const REVIEWS_KEY = "autoflowng_reviews_v1";

function getAllReviews(code) {
  try {
    const saved = localStorage.getItem(REVIEWS_KEY);
    const all = saved ? JSON.parse(saved) : {};
    return all[code] || [];
  } catch { return []; }
}

function saveReview(code, review) {
  try {
    const saved = localStorage.getItem(REVIEWS_KEY);
    const all = saved ? JSON.parse(saved) : {};
    all[code] = [...(all[code] || []), review];
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// REVIEW PROMPT
// ═══════════════════════════════════════════════════════════════
function ReviewPrompt({ onClose, regionData }) {
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!text.trim() || !name.trim()) return;
    const review = {
      name: Sec.sanitize(name),
      role: Sec.sanitize(role) || "AutoFlowNG User",
      avatar: name.trim()[0].toUpperCase(),
      color: ["#00C896","#38BDF8","#A78BFA","#FBBF24","#FB7185"][Math.floor(Math.random()*5)],
      stars: rating,
      text: Sec.sanitize(text),
      country: regionData?.country || "Global",
      code: regionData?.code || "GLOBAL",
      date: new Date().toISOString(),
    };
    saveReview(review.code, review);
    setSubmitted(true);
    setTimeout(onClose, 2500);
  }

  if (submitted) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{textAlign:"center",animation:"bounceIn 0.5s ease"}}>
        <div style={{fontSize:64,marginBottom:16}}>🎉</div>
        <div style={{fontSize:24,fontWeight:900,fontFamily:"'Syne',sans-serif",color:C.green,marginBottom:8}}>Thank you!</div>
        <div style={{fontSize:16,color:C.sub}}>Your review helps others in {regionData?.country || "your country"} discover AutoFlowNG.</div>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:C.s2,border:`1px solid ${C.hi}`,borderRadius:22,padding:"32px 28px",width:"100%",maxWidth:460,animation:"popIn 0.28s cubic-bezier(0.16,1,0.3,1)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:12}}>⭐</div>
          <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:6}}>How was your experience?</div>
          <div style={{fontSize:15,color:C.sub,lineHeight:1.7}}>Your 3-day trial just ended. Share your honest thoughts — it helps businesses in <strong style={{color:C.green}}>{regionData?.country||"your country"}</strong> make better decisions.</div>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:24}}>
          {[1,2,3,4,5].map(n=>(
            <span key={n} onClick={()=>setRating(n)} style={{fontSize:36,cursor:"pointer",transition:"transform 0.15s",transform:n<=rating?"scale(1.15)":"scale(1)",filter:n<=rating?"none":"grayscale(1) opacity(0.4)"}}>★</span>
          ))}
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,color:C.sub,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'DM Mono',monospace"}}>Your Name</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Emeka Obi" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.ink,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,color:C.sub,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'DM Mono',monospace"}}>Your Role / Business</div>
          <input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Online Store Owner · Lagos" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.ink,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:13,color:C.sub,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'DM Mono',monospace"}}>Your Review</div>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Be honest — what did you find most useful? What would you improve?" rows={4} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.ink,fontSize:15,outline:"none",boxSizing:"border-box",resize:"vertical",fontFamily:"'DM Sans',sans-serif",lineHeight:1.7}}/>
        </div>
        <button onClick={submit} disabled={!text.trim()||!name.trim()} style={{width:"100%",background:(!text.trim()||!name.trim())?"rgba(0,200,150,0.3)":"#00C896",color:"#04221A",border:"none",borderRadius:12,padding:"14px",fontSize:16,fontWeight:800,cursor:(!text.trim()||!name.trim())?"not-allowed":"pointer",marginBottom:10,fontFamily:"'Syne',sans-serif"}}>
          Submit Review →
        </button>
        <button onClick={onClose} style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,color:C.sub,borderRadius:10,padding:"10px",fontSize:15,cursor:"pointer"}}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

const NIGERIAN_BANKS = ["Access Bank","Zenith Bank","GTBank","First Bank","UBA","Fidelity Bank","Union Bank","Sterling Bank","Wema Bank","Polaris Bank","Stanbic IBTC","Providus Bank","OPay","Kuda Bank","PalmPay","Moniepoint","Carbon"];

const Sec = {
  sanitize: s => String(s).replace(/[<>'"&]/g, c => ({"<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;","&":"&amp;"}[c])).trim().slice(0,500),
  isEmail: e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
  isAccount: n => /^\d{10}$/.test(n),
  bad: s => /script|javascript:|on\w+=|union.*select|drop.*table/i.test(s),
  mask: n => n?.length >= 4 ? "••••••" + n.slice(-4) : "••••••••••",
  code: () => { const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",a=new Uint8Array(8); crypto.getRandomValues(a); return "AF-"+Array.from(a).map(b=>c[b%c.length]).join("").slice(0,6); },
};

// ═══════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════
function Chip({ color=C.green, children, dot }) {
  return <span style={{ display:"inline-flex",alignItems:"center",gap:6,background:color+"15",border:`1px solid ${color}30`,color,borderRadius:20,padding:"4px 13px",fontSize:15,fontWeight:700,letterSpacing:"0.04em",fontFamily:"'DM Mono',monospace" }}>{dot&&<span style={{width:6,height:6,borderRadius:"50%",background:color,display:"inline-block",animation:"glw 2s ease infinite"}}/>}{children}</span>;
}

function Stars({ n=5 }) {
  return <div style={{display:"flex",gap:2}}>{Array.from({length:n}).map((_,i)=><span key={i} style={{color:C.amber,fontSize:15}}>★</span>)}</div>;
}

function PBtn({ children, onClick, color=C.green, lg, sm, disabled, fullWidth }) {
  const [h,setH]=useState(false);
  const p=lg?"18px 44px":sm?"9px 18px":"13px 26px", fs=lg?17:sm?12:15;
  const isGreen = color===C.green;
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:disabled?C.ghost:color,color:disabled?C.sub:(isGreen?"#04221A":"#fff"),border:"none",borderRadius:14,padding:p,fontSize:fs,fontWeight:800,fontFamily:"'Syne',sans-serif",cursor:disabled?"not-allowed":"pointer",transform:h&&!disabled?"translateY(-2px)":"none",boxShadow:disabled?"none":(h?`0 14px 44px ${color}66, 0 0 0 1px ${color}55 inset`:`0 6px 28px ${color}45, 0 0 0 1px ${color}33 inset`),transition:"all 0.18s",opacity:disabled?0.45:1,width:fullWidth?"100%":"auto",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{children}</button>;
}

function GBtn({ children, onClick, fullWidth }) {
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:"transparent",border:`1px solid ${h?C.hi:C.border}`,color:h?C.ink:C.sub,borderRadius:11,padding:"12px 22px",fontSize:15,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",transition:"all 0.18s",width:fullWidth?"100%":"auto"}}>{children}</button>;
}

function SectionLabel({ color=C.green, children }) {
  return <div style={{fontSize:15,letterSpacing:"0.14em",textTransform:"uppercase",color,fontWeight:700,marginBottom:14,fontFamily:"'DM Mono',monospace"}}>{children}</div>;
}

function Input({ type="text", value, onChange, placeholder, mono, error, onKeyDown }) {
  const [foc,setFoc]=useState(false);
  return <>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${error?"#F87171":foc?C.green+"55":C.border}`,borderRadius:11,padding:"13px 16px",color:C.ink,fontSize:15,fontFamily:mono?"'DM Mono',monospace":"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box",letterSpacing:mono?"0.1em":"normal",transition:"border-color 0.2s"}}/>
    {error&&<div style={{fontSize:15,color:"#F87171",marginTop:5}}>⚠ {error}</div>}
  </>;
}

function FieldLabel({ children }) {
  return <div style={{fontSize:15,color:C.sub,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:8,marginTop:18,fontFamily:"'DM Mono',monospace"}}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════
// MODAL BASE
// ═══════════════════════════════════════════════════════════════
function Modal({ children, onClose, maxW=440 }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.s2,border:`1px solid ${C.hi}`,borderRadius:22,padding:"32px 28px",width:"100%",maxWidth:maxW,animation:"popIn 0.28s cubic-bezier(0.16,1,0.3,1)",maxHeight:"90vh",overflowY:"auto",boxSizing:"border-box"}}>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAY MODAL
// ═══════════════════════════════════════════════════════════════
function PayModal({ plan, onClose, onSuccess }) {
  const [email,setEmail]=useState(""),err=useRef(""),loading=useRef(false);
  const [,rerender]=useState(0);

  function ensurePaystackLoaded(cb) {
    if (window.PaystackPop) { cb(); return; }
    const script = document.getElementById('paystack-script') || (() => {
      const s = document.createElement('script');
      s.id = 'paystack-script';
      s.src = 'https://js.paystack.co/v1/inline.js';
      document.head.appendChild(s);
      return s;
    })();
    script.onload = cb;
    setTimeout(() => {
      if (window.PaystackPop) cb();
      else { err.current = "Payment system failed to load. Please refresh the page."; rerender(n=>n+1); loading.current=false; rerender(n=>n+1); }
    }, 5000);
  }

  function pay() {
    err.current="";
    if (!Sec.isEmail(email)) { err.current="Enter a valid email address"; rerender(n=>n+1); return; }
    if (Sec.bad(email)) { err.current="Invalid input"; rerender(n=>n+1); return; }
    const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!key) { err.current="Payment not configured. Please contact support."; rerender(n=>n+1); return; }
    loading.current=true; rerender(n=>n+1);
    ensurePaystackLoaded(() => {
      // FIX: Use crypto.getRandomValues for secure reference generation
      const refBytes = new Uint8Array(6);
      crypto.getRandomValues(refBytes);
      const refChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const refSuffix = Array.from(refBytes).map(b => refChars[b % 32]).join("");
      const handler = window.PaystackPop.setup({
        key,
        email,
        amount: plan.amount * 100,
        currency: plan.currency || "NGN",
        ref: "AFN-" + Date.now() + "-" + refSuffix,
        metadata: { plan: plan.name, custom_fields: [{ display_name: "Plan", variable_name: "plan", value: plan.name }] },
        onSuccess: function(transaction) {
          // FIX: Use API_BASE instead of hardcoded URL
          fetch(`${API_BASE}/api/payments/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("autoflowng_token")||""}` },
            body: JSON.stringify({ reference: transaction.reference, email, plan: plan.name, amount: plan.amount })
          })
          .then(r => r.json())
          .then(data => {
            loading.current=false; rerender(n=>n+1);
            if (data.status === "success") { onSuccess(email); }
            else { err.current="Payment verification failed. Contact support with ref: " + transaction.reference; rerender(n=>n+1); }
          })
          .catch(() => { err.current="Network error. Contact support with ref: " + transaction.reference; rerender(n=>n+1); });
        },
        onCancel: function() { loading.current=false; rerender(n=>n+1); }
      });
      handler.openIframe();
    });
  }
  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
        <Chip color={C.green}>🔒 SSL Secured</Chip>
        <Chip color={C.sky}>✓ Paystack</Chip>
      </div>
      <div style={{fontSize:15,color:C.sub,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>Subscribing to</div>
      <div style={{fontSize:24,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:2}}>{plan.name} Plan</div>
      <div style={{fontSize:42,fontWeight:900,color:plan.color,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.04em",lineHeight:1,marginBottom:20}}>
        {plan.price}<span style={{fontSize:15,color:C.sub,fontWeight:400}}>/month</span>
      </div>
      <div style={{height:1,background:C.border,marginBottom:4}} />
      <FieldLabel>Your Email Address</FieldLabel>
      <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@yourbusiness.com" error={err.current} onKeyDown={e=>e.key==="Enter"&&pay()} />
      <div style={{background:"rgba(0,200,150,0.07)",border:`1px solid rgba(0,200,150,0.18)`,borderRadius:12,padding:"13px 16px",margin:"18px 0 22px",fontSize:15,color:C.sub,lineHeight:1.7}}>
        🔒 Pay securely via <strong style={{color:C.green}}>Paystack</strong> — Debit card, bank transfer, or USSD. Instant setup after payment.
      </div>
      <PBtn onClick={pay} disabled={!email||loading.current} fullWidth lg>{loading.current?"Processing...":  `Pay ${plan.price} →`}</PBtn>
      <div style={{marginTop:10}}><GBtn onClick={onClose} fullWidth>Cancel</GBtn></div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// WITHDRAW MODAL
// ═══════════════════════════════════════════════════════════════
function WithdrawModal({ balance, onClose, onDone }) {
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({bank:"",account:"",name:""});
  const [errs,setErrs]=useState({});
  const [loading,setLoading]=useState(false);
  const [agreed,setAgreed]=useState(false);

  function validate() {
    const e={};
    if (!form.bank) e.bank="Select your bank";
    if (!Sec.isAccount(form.account)) e.account="Must be exactly 10 digits";
    if (!form.name||form.name.length<3) e.name="Enter your account name";
    if (Sec.bad(form.name)) e.name="Invalid characters detected";
    setErrs(e); return !Object.keys(e).length;
  }

  // FIX: Replace fake setTimeout with real API call to verify withdrawal details
  function verify() {
    if (!validate()) return;
    setLoading(true);
    fetch(`${API_BASE}/api/referrals/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("autoflowng_token")||""}`
      },
      body: JSON.stringify({ bank: form.bank, account: form.account, name: form.name, amount: balance })
    })
    .then(r => r.json())
    .then(data => {
      setLoading(false);
      if (data.status === "success" || data.verified) {
        setStep(2);
      } else {
        setErrs(e => ({ ...e, account: data.error || "Verification failed. Please check your details." }));
      }
    })
    .catch(() => {
      setLoading(false);
      setErrs(e => ({ ...e, account: "Network error. Please try again." }));
    });
  }

  function confirm() {
    if (!agreed) return;
    setStep(3);
    setTimeout(()=>{ onDone(); onClose(); },2500);
  }

  return (
    <Modal onClose={onClose} maxW={460}>
      <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
        <Chip color={C.green}>🔒 Encrypted</Chip>
        <Chip color={C.sky}>✓ Secure Transfer</Chip>
      </div>

      {step===1&&<>
        <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:4}}>Withdraw Earnings</div>
        <div style={{fontSize:15,color:C.sub,marginBottom:4}}>Sending <strong style={{color:C.green}}>₦{balance.toLocaleString()}</strong> to your bank account</div>
        <FieldLabel>Bank Name</FieldLabel>
        <select value={form.bank} onChange={e=>setForm(f=>({...f,bank:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${errs.bank?"#F87171":C.border}`,borderRadius:11,padding:"13px 16px",color:form.bank?C.ink:"rgba(232,238,255,0.25)",fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box"}}>
          <option value="" style={{background:C.s2}}>Select your bank</option>
          {NIGERIAN_BANKS.map(b=><option key={b} value={b} style={{background:C.s2}}>{b}</option>)}
        </select>
        {errs.bank&&<div style={{fontSize:15,color:"#F87171",marginTop:4}}>⚠ {errs.bank}</div>}
        <FieldLabel>Account Number</FieldLabel>
        <Input value={form.account} onChange={e=>setForm(f=>({...f,account:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="10-digit account number" mono error={errs.account}/>
        <FieldLabel>Account Name</FieldLabel>
        <Input value={form.name} onChange={e=>setForm(f=>({...f,name:Sec.sanitize(e.target.value)}))} placeholder="Name on your bank account" error={errs.name}/>
        <div style={{background:"rgba(251,191,36,0.07)",border:`1px solid rgba(251,191,36,0.2)`,borderRadius:12,padding:"13px 16px",margin:"18px 0 22px",fontSize:15,color:C.sub,lineHeight:1.7}}>
          ⚡ Account verified via <strong style={{color:C.amber}}>Paystack Transfer API</strong>. Funds arrive within 24 hours.
        </div>
        <PBtn onClick={verify} disabled={loading} fullWidth lg>{loading?"Verifying account...":"Verify & Continue →"}</PBtn>
        <div style={{marginTop:10}}><GBtn onClick={onClose} fullWidth>Cancel</GBtn></div>
      </>}

      {step===2&&<>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:12}}>✅</div>
          <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:6}}>Account Verified</div>
          <div style={{fontSize:15,color:C.sub}}>Please confirm your details below</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",marginBottom:20}}>
          {[["Bank",form.bank],["Account",Sec.mask(form.account)],["Name",form.name],["Amount",`₦${balance.toLocaleString()}`]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:15,color:C.sub}}>{l}</span>
              <span style={{fontSize:15,fontWeight:700,color:l==="Amount"?C.green:C.ink}}>{v}</span>
            </div>
          ))}
        </div>
        <label style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:22,cursor:"pointer"}}>
          <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:3,accentColor:C.green,width:16,height:16,flexShrink:0}}/>
          <span style={{fontSize:15,color:C.sub,lineHeight:1.7}}>I confirm these bank details are correct. AutoFlowNG is not responsible for transfers to incorrect accounts.</span>
        </label>
        <PBtn onClick={confirm} disabled={!agreed} fullWidth lg>Confirm Withdrawal →</PBtn>
        <div style={{marginTop:10}}><GBtn onClick={()=>setStep(1)} fullWidth>← Go Back</GBtn></div>
      </>}

      {step===3&&(
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:56,marginBottom:16,animation:"bounceIn 0.5s ease"}}>🎉</div>
          <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:10}}>Withdrawal Submitted!</div>
          <div style={{fontSize:15,color:C.sub,lineHeight:1.8}}>Your <strong style={{color:C.green}}>₦{balance.toLocaleString()}</strong> will arrive within <strong style={{color:C.green}}>24 hours</strong>.</div>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════
function LandingPage({ onApp }) {
  const { mobile, tablet, w } = useBreakpoint();
  const [payPlan, setPayPlan] = useState(null);
  const [success, setSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [regionData] = useState(()=>detectRegionData());
  const plans = getRegionalPlans(regionData);
  const region = regionData.group === "africa" ? "africa" : "western";
  const isAfrica = region === "africa";
  const px = mobile ? "5%" : tablet ? "6%" : "8%";
  const isSm = mobile || tablet;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:"'DM Sans',sans-serif", overflowX:"hidden" }}>
      <GlobalStyles />
      {payPlan && <PayModal plan={payPlan} onClose={()=>setPayPlan(null)} onSuccess={()=>{ setPayPlan(null); setSuccess(true); setTimeout(()=>{ setSuccess(false); onApp(); },2000); }}/>}
      {success && (
        <div style={{position:"fixed",top:mobile?16:24,right:mobile?16:24,zIndex:2000,background:C.s2,border:`1px solid ${C.green}50`,borderRadius:14,padding:"14px 20px",animation:"slideDown 0.3s ease",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
          <div style={{color:C.green,fontWeight:800,marginBottom:4}}>✓ Payment Successful!</div>
          <div style={{fontSize:15,color:C.sub}}>Setting up your workspace...</div>
        </div>
      )}

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,backdropFilter:"blur(24px)",background:"rgba(4,6,15,0.88)",borderBottom:`1px solid ${C.border}`,padding:`0 ${px}`,display:"flex",alignItems:"center",justifyContent:"space-between",height:mobile?58:66}}>
        <Logo size={mobile?"sm":"md"} onClick={()=>{}} />
        {!mobile && (
          <div style={{display:"flex",gap:28,alignItems:"center"}}>
            {["Features","Pricing","Security"].map(l=>(
              <a key={l} href={`#${l.toLowerCase()}`} style={{fontSize:15,color:C.sub,textDecoration:"none",fontWeight:500,transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=C.ink} onMouseLeave={e=>e.target.style.color=C.sub}>{l}</a>
            ))}
            <button onClick={onApp} data-magnet style={{background:"transparent",border:`1px solid ${C.border}`,color:C.ink,padding:"8px 16px",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.green+"60";e.currentTarget.style.color=C.green;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.ink;}}>Sign In</button>
            <PBtn onClick={onApp} sm>Get Started</PBtn>
          </div>
        )}
        {mobile && (
          <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:"none",color:C.ink,fontSize:22,cursor:"pointer",padding:8}}>
            {menuOpen?"✕":"☰"}
          </button>
        )}
      </nav>

      {mobile && menuOpen && (
        <div style={{position:"fixed",top:58,left:0,right:0,zIndex:99,background:C.s1,borderBottom:`1px solid ${C.border}`,padding:"16px 5%",display:"flex",flexDirection:"column",gap:16}}>
          {["Features","Pricing","Security"].map(l=>(
            <a key={l} href={`#${l.toLowerCase()}`} onClick={()=>setMenuOpen(false)} style={{fontSize:16,color:C.sub,textDecoration:"none",fontWeight:600,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>{l}</a>
          ))}
          <button onClick={()=>{ setMenuOpen(false); onApp(); }} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.ink,padding:"12px 16px",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Sign In</button>
          <PBtn onClick={()=>{ setMenuOpen(false); onApp(); }} lg>Get Started →</PBtn>
        </div>
      )}

      {/* HERO */}
      <section style={{position:"relative",overflow:"hidden",padding:mobile?`80px ${px} 60px`:`110px ${px} 90px`,textAlign:"center"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}><Particles opacity={0.5}/></div>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 65% 55% at 50% 0%, rgba(0,200,150,0.08) 0%, transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",opacity:0.55}}>
          <WireSphere3D size={mobile?340:tablet?460:620}/>
        </div>
        <div style={{position:"relative",zIndex:1,maxWidth:840,margin:"0 auto"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,200,150,0.1)",border:`1px solid rgba(0,200,150,0.24)`,borderRadius:20,padding:"6px 16px",fontSize:15,color:C.green,marginBottom:28,fontWeight:700}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:C.green,display:"inline-block",animation:"glw 2s ease infinite"}}/>
            AI-Powered Business Automation
          </div>
          <Parallax speed={0.08}><h1 style={{fontSize:mobile?"clamp(34px,9vw,52px)":tablet?"clamp(44px,6vw,62px)":"clamp(52px,5.5vw,80px)",fontWeight:900,lineHeight:1.04,letterSpacing:"-0.045em",margin:"0 0 22px",fontFamily:"'Syne',sans-serif"}}>
            Automate Everything.<br/>
            <span style={{background:`linear-gradient(90deg, ${C.green}, ${C.sky}, ${C.violet})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Grow Without Limits.
            </span>
          </h1></Parallax>
          <p style={{fontSize:mobile?15:18,color:C.sub,maxWidth:540,margin:"0 auto 40px",lineHeight:1.78}}>
            Connect your Gmail, WhatsApp, Instagram, and 7 more platforms. Your AI agent handles messages, follow-ups, content, and leads — every hour of every day.
          </p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <PBtn onClick={onApp} lg>Start 3-Day Free Trial →</PBtn>
          </div>
          <p style={{fontSize:15,color:C.sub,marginTop:14}}>3 days free · Then from {isAfrica?"₦15,000":"$49"}/month · Pay via {isAfrica?"Paystack":"Stripe / Card"}</p>

          <div style={{marginTop:mobile?44:60,position:"relative",overflow:"hidden",maskImage:"linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)",WebkitMaskImage:"linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)"}}>
            <div style={{display:"flex",gap:mobile?14:20,animation:"marqL 28s linear infinite",width:"max-content"}}>
              {[...PLATFORMS,...PLATFORMS].map((p,i)=>(
                <div key={p.id+i} title={p.name} style={{flexShrink:0,transition:"transform 0.2s, box-shadow 0.2s",cursor:"default"}}
                  onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.12)";e.currentTarget.style.boxShadow=`0 0 22px ${p.color}50`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}
                >
                  <PlatformTile id={p.id} size={mobile?44:52}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{padding:`0 ${px} 60px`}}>
        <div style={{display:"grid",gridTemplateColumns:mobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:1,background:C.border,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",maxWidth:900,margin:"0 auto"}}>
          {[["10M+","Actions Executed",C.green],["500+","Businesses Served",C.sky],["99.9%","Platform Uptime",C.amber],["24/7","AI Always Active",C.violet]].map(([n,l,col],i)=>(
            <div key={l} style={{background:C.s1,textAlign:"center",padding:mobile?"20px 12px":"28px 20px"}}>
              <div style={{fontSize:mobile?26:36,fontWeight:900,color:col,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.03em"}}>{n}</div>
              <div style={{fontSize:mobile?11:13,color:C.sub,marginTop:6}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* REAL SERVICE ICONS */}
      <ServiceIcons mobile={mobile} px={px}/>

      {/* FEATURES */}
      <section id="features" style={{padding:mobile?`40px ${px} 60px`:`60px ${px} 80px`}}>
        <div style={{textAlign:"center",marginBottom:mobile?36:52}}>
          <SectionLabel>FEATURES</SectionLabel>
          <h2 style={{fontSize:mobile?"clamp(26px,7vw,36px)":"clamp(30px,4vw,50px)",fontWeight:900,letterSpacing:"-0.035em",fontFamily:"'Syne',sans-serif",lineHeight:1.1}}>
            Built for businesses that<br/><span style={{color:C.sub}}>refuse to slow down</span>
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"repeat(2,1fr)":"repeat(3,1fr)",gap:14,maxWidth:1100,margin:"0 auto"}}>
          {FEATURES.map((f,i)=>(
            <Reveal key={f.title} delay={i*80}><FeatureCard f={f} mobile={mobile}/></Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{padding:mobile?`40px ${px} 60px`:`60px ${px} 80px`,background:C.s1,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
        <div style={{textAlign:"center",marginBottom:mobile?36:52}}>
          <SectionLabel color={C.sky}>HOW IT WORKS</SectionLabel>
          <h2 style={{fontSize:mobile?"clamp(26px,7vw,36px)":"clamp(30px,4vw,50px)",fontWeight:900,letterSpacing:"-0.035em",fontFamily:"'Syne',sans-serif"}}>
            Live in <span style={{color:C.sky}}>3 steps</span>
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"repeat(3,1fr)",gap:mobile?12:0,maxWidth:900,margin:"0 auto",border:mobile?"none":`1px solid ${C.border}`,borderRadius:20,overflow:"hidden"}}>
          {[
            {n:"01",t:"Connect Platforms",d:"Link your accounts in one tap. No coding, no technical knowledge. Done in minutes.",icon:"🔗",c:C.green},
            {n:"02",t:"Pick Your Automations",d:"Choose from ready-made templates or describe what you want in plain English. AI sets it up instantly.",icon:"⚡",c:C.sky},
            {n:"03",t:"Watch It Work",d:"Your AI agent runs 24/7 handling tasks, replying to customers, and capturing leads while you focus on growth.",icon:"🚀",c:C.violet},
          ].map((s,i)=>(
            <div key={s.n} style={{padding:mobile?"24px":tablet?"28px":"36px 32px",borderRight:!mobile&&i<2?`1px solid ${C.border}`:"none",borderBottom:mobile&&i<2?`1px solid ${C.border}`:"none",background:C.bg}}>
              <div style={{fontSize:mobile?38:46,marginBottom:14}}>{s.icon}</div>
              <div style={{fontSize:15,color:s.c,fontWeight:700,letterSpacing:"0.06em",marginBottom:10,fontFamily:"'DM Mono',monospace"}}>{s.n}</div>
              <div style={{fontSize:mobile?16:18,fontWeight:800,marginBottom:10,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.02em"}}>{s.t}</div>
              <div style={{fontSize:mobile?13:14,color:C.sub,lineHeight:1.75}}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{padding:mobile?`50px ${px} 60px`:`70px ${px} 80px`}}>
        <div style={{textAlign:"center",marginBottom:mobile?36:52}}>
          <SectionLabel color={C.violet}>WHAT CLIENTS SAY</SectionLabel>
          <h2 style={{fontSize:mobile?"clamp(26px,7vw,36px)":"clamp(30px,4vw,50px)",fontWeight:900,letterSpacing:"-0.035em",fontFamily:"'Syne',sans-serif"}}>
            Real results from <span style={{color:C.violet}}>real businesses</span>
          </h2>
          <div style={{fontSize:15,color:C.sub,marginTop:8}}>
            Showing reviews from <strong style={{color:C.violet}}>{regionData.country}</strong>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"1fr":"repeat(3,1fr)",gap:14,maxWidth:1100,margin:"0 auto"}}>
          {getTestimonialsForRegion(regionData).map((t,i)=>(
            <Reveal key={t.name} delay={i*120} y={32}><TestimonialCard t={t} mobile={mobile}/></Reveal>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{padding:mobile?`50px ${px} 60px`:`70px ${px} 80px`,background:C.s1,borderTop:`1px solid ${C.border}`}}>
        <div style={{textAlign:"center",marginBottom:mobile?36:52}}>
          <SectionLabel color={C.amber}>PRICING</SectionLabel>
          <h2 style={{fontSize:mobile?"clamp(26px,7vw,36px)":"clamp(30px,4vw,50px)",fontWeight:900,letterSpacing:"-0.035em",fontFamily:"'Syne',sans-serif",marginBottom:12}}>
            Choose your <span style={{color:C.amber}}>plan</span>
          </h2>
          <p style={{color:C.sub,fontSize:mobile?14:16,marginBottom:20}}>{isAfrica?"3 days free · Pay via Paystack — Debit card · Bank transfer · USSD":"3 days free · Pay via Stripe — Visa · Mastercard · Amex"}</p>
          <div style={{display:"inline-flex",alignItems:"center",gap:0,background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,padding:4,marginBottom:8}}>
            <button onClick={()=>{}} style={{padding:"8px 20px",borderRadius:9,border:"none",background:isAfrica?C.amber:"transparent",color:isAfrica?"#000":C.sub,fontSize:15,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}}>🌍 Africa (₦)</button>
            <button onClick={()=>{}} style={{padding:"8px 20px",borderRadius:9,border:"none",background:!isAfrica?"#A78BFA":"transparent",color:!isAfrica?"#000":C.sub,fontSize:15,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}}>🌎 International ($)</button>
          </div>
          {!isAfrica && <p style={{fontSize:15,color:C.sub,marginTop:4}}>🇺🇸 USA · 🇬🇧 UK · 🇨🇦 Canada · 🇦🇺 Australia · 🇪🇺 Europe</p>}
          {isAfrica && <p style={{fontSize:15,color:C.sub,marginTop:4}}>{AFRICA_COUNTRIES.map(c=>`${c.flag} ${c.name}`).join(' · ')}</p>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"1fr":"repeat(3,1fr)",gap:mobile?14:18,maxWidth:1020,margin:"0 auto"}}>
          {plans.map((plan,i)=>(
            <PlanCard key={plan.name} plan={plan} onSelect={()=>setPayPlan(plan)} mobile={mobile}/>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:24}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 20px",fontSize:15,color:C.sub}}>
            🔒 All payments secured by <strong style={{color:C.green}}>Paystack</strong>
          </div>
        </div>
      </section>

      {/* REFERRAL BANNER */}
      <section style={{padding:`0 ${px}`,margin:mobile?"40px 0 0":"60px 0 0"}}>
        <div style={{background:`linear-gradient(135deg, rgba(251,191,36,0.08), rgba(0,200,150,0.06))`,border:`1px solid rgba(251,191,36,0.2)`,borderRadius:22,padding:mobile?"28px 24px":"40px 48px",display:"flex",flexDirection:mobile?"column":"row",justifyContent:"space-between",alignItems:mobile?"flex-start":"center",gap:mobile?20:24,maxWidth:1020,margin:"0 auto"}}>
          <div>
            <div style={{fontSize:mobile?20:26,fontWeight:900,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.025em",marginBottom:8}}>🎁 Earn ₦1,000 Per Referral</div>
            <div style={{fontSize:mobile?13:15,color:C.sub,lineHeight:1.7,maxWidth:480}}>Share your unique link. Every friend who subscribes earns you ₦1,000 — paid directly to your Nigerian bank account, verified by Paystack.</div>
          </div>
          <PBtn onClick={onApp} lg>Start Referring →</PBtn>
        </div>
      </section>

      {/* SECURITY */}
      <section id="security" style={{padding:mobile?`50px ${px} 60px`:`70px ${px} 80px`}}>
        <div style={{textAlign:"center",marginBottom:mobile?36:48}}>
          <SectionLabel color={C.green}>SECURITY</SectionLabel>
          <h2 style={{fontSize:mobile?"clamp(26px,7vw,36px)":"clamp(30px,4vw,50px)",fontWeight:900,letterSpacing:"-0.035em",fontFamily:"'Syne',sans-serif"}}>
            Your data is <span style={{color:C.green}}>always protected</span>
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"repeat(2,1fr)":"repeat(3,1fr)",gap:12,maxWidth:1020,margin:"0 auto"}}>
          {[
            {icon:"🔐",t:"Encrypted Storage",d:"Your data is encrypted in transit (HTTPS/TLS) and at rest in our database"},
            {icon:"🚦",t:"Rate Limiting",d:"Brute force and bot attacks blocked automatically"},
            {icon:"🧹",t:"Input Sanitization",d:"XSS and SQL injection attacks prevented"},
            {icon:"🔒",t:"Secure Sessions",d:"Session tokens expire and rotate to prevent hijacking"},
            {icon:"👁",t:"Anomaly Detection",d:"Basic rate limiting and suspicious activity monitoring protect your account"},
            {icon:"🔑",t:"OAuth 2.0 Only",d:"Your platform passwords are never stored by us"},
          ].map(m=>(
            <div key={m.t} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,padding:mobile?"18px":"22px 24px",display:"flex",gap:14,alignItems:"flex-start",transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.green+"35"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
            >
              <div style={{width:38,height:38,borderRadius:10,background:"rgba(0,200,150,0.1)",border:`1px solid rgba(0,200,150,0.18)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{m.icon}</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,marginBottom:4,fontFamily:"'Syne',sans-serif"}}>{m.t}</div>
                <div style={{fontSize:15,color:C.sub,lineHeight:1.6}}>{m.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:mobile?`50px ${px} 60px`:`70px ${px} 90px`,textAlign:"center",borderTop:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 55% 65% at 50% 100%, rgba(0,200,150,0.06), transparent)`,pointerEvents:"none"}}/>
        <h2 style={{fontSize:mobile?"clamp(28px,8vw,42px)":"clamp(36px,5vw,66px)",fontWeight:900,letterSpacing:"-0.04em",marginBottom:16,fontFamily:"'Syne',sans-serif",lineHeight:1.06,position:"relative",zIndex:1}}>
          Start automating<br/><span style={{color:C.green}}>your business today</span>
        </h2>
        <p style={{color:C.sub,fontSize:mobile?14:17,marginBottom:36,position:"relative",zIndex:1}}>Join hundreds of businesses saving hours every single day.</p>
        <PBtn onClick={onApp} lg>Get Started Free →</PBtn>
      </section>

      {/* FOOTER */}
      <footer style={{padding:`24px ${px}`,borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:mobile?"column":"row",justifyContent:"space-between",alignItems:mobile?"flex-start":"center",gap:16}}>
        <Logo size="sm"/>
        <span style={{fontSize:15,color:C.ghost}}>© 2026 AutoFlowNG · All rights reserved</span>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          {["Privacy","Terms","Security","Support"].map(l=><span key={l} style={{fontSize:15,color:C.ghost,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=C.sub} onMouseLeave={e=>e.target.style.color=C.ghost}>{l}</span>)}
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ f, mobile }) {
  const [h,setH]=useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:C.s1,border:`1px solid ${h?f.color+"40":C.border}`,borderRadius:18,padding:mobile?"22px":"28px 26px",transition:"all 0.25s ease",transform:h?"translateY(-4px)":"none",boxShadow:h?`0 14px 40px ${f.color}14`:"none"}}>
      <div style={{width:46,height:46,borderRadius:13,background:f.color+"13",border:`1px solid ${f.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:18}}>{f.icon}</div>
      <div style={{fontSize:mobile?15:17,fontWeight:800,marginBottom:10,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.01em"}}>{f.title}</div>
      <div style={{fontSize:mobile?13:14,color:C.sub,lineHeight:1.75}}>{f.desc}</div>
    </div>
  );
}

function TestimonialCard({ t, mobile }) {
  const [h,setH]=useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:C.s1,border:`1px solid ${h?t.color+"35":C.border}`,borderRadius:20,padding:mobile?"22px":"28px 26px",transition:"all 0.25s ease",transform:h?"translateY(-4px)":"none",display:"flex",flexDirection:"column",gap:16}}>
      <Stars/>
      <div style={{fontSize:16,fontWeight:800,color:t.color,fontFamily:"'Syne',sans-serif",lineHeight:1,marginBottom:-4}}>"</div>
      <p style={{fontSize:mobile?13:14,color:C.ink,lineHeight:1.8,margin:0,flex:1}}>{t.text}</p>
      <div style={{display:"flex",alignItems:"center",gap:12,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${t.color},${C.sky})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"#000",flexShrink:0}}>{t.avatar}</div>
        <div>
          <div style={{fontSize:15,fontWeight:800}}>{t.name}</div>
          <div style={{fontSize:15,color:C.sub}}>{t.role}</div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, onSelect, mobile }) {
  const [h,setH]=useState(false);
  return (
    <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:plan.popular?`linear-gradient(160deg,rgba(0,200,150,0.07),rgba(14,165,233,0.04))`:C.s2,border:`1.5px solid ${plan.popular?plan.color+"55":h?plan.color+"30":C.border}`,borderRadius:22,padding:mobile?"24px":"30px 26px",position:"relative",transition:"all 0.25s ease",transform:h?"translateY(-5px)":"none",boxShadow:h?`0 18px 52px ${plan.color}16`:"none"}}>
      {plan.popular&&<div style={{position:"absolute",top:18,right:18}}><Chip color={C.green}>MOST POPULAR</Chip></div>}
      <div style={{fontSize:15,color:C.sub,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>{plan.name}</div>
      <div style={{fontSize:15,color:C.ghost,marginBottom:14}}>{plan.tagline}</div>
      <div style={{fontSize:mobile?36:42,fontWeight:900,color:plan.color,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.04em",lineHeight:1,marginBottom:4}}>
        {plan.price}<span style={{fontSize:15,color:C.sub,fontWeight:400}}>/mo</span>
      </div>
      <div style={{height:1,background:C.border,margin:"20px 0"}}/>
      <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
        {plan.features.map(f=>(
          <li key={f} style={{display:"flex",gap:10,fontSize:mobile?13:14,color:"rgba(232,238,255,0.7)"}}>
            <span style={{color:plan.color,fontWeight:700,flexShrink:0}}>✓</span>{f}
          </li>
        ))}
      </ul>
      <button onClick={onSelect} style={{
        width:"100%",
        background: plan.popular ? `linear-gradient(135deg,${plan.color},#0EA5E9)` : plan.color+"18",
        color: "#fff",
        border:`1.5px solid ${plan.color}`,
        borderRadius:11, padding:"14px 0", fontWeight:800,
        fontSize:mobile?14:15, fontFamily:"'Syne',sans-serif",
        cursor:"pointer", transition:"all 0.18s",
        boxShadow: plan.popular ? `0 4px 20px ${plan.color}40` : "none",
      }}
        onMouseEnter={e=>{ e.currentTarget.style.opacity="0.88"; e.currentTarget.style.transform="translateY(-1px)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; e.currentTarget.style.transform="none"; }}
      >Start Free Trial →</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRIAL SYSTEM
// ═══════════════════════════════════════════════════════════════
const TRIAL_DAYS = 3;

function useTrialSystem() {
  React.useEffect(() => {
    const userData = localStorage.getItem("autoflowng_user");
    if (userData) {
      try {
        const u = JSON.parse(userData);
        if (u.trial_ends_at) {
          const expiresAt = new Date(u.trial_ends_at).getTime();
          const startedAt = u.trial_started_at ? new Date(u.trial_started_at).getTime() : expiresAt - (3*24*60*60*1000);
          const existing = localStorage.getItem("autoflowng_trial");
          const parsed = existing ? JSON.parse(existing) : null;
          if (!parsed || expiresAt > parsed.expiresAt) {
            localStorage.setItem("autoflowng_trial", JSON.stringify({ startedAt, expiresAt, subscribed: u.plan && u.plan !== "trial" }));
          }
        }
      } catch(e) {}
    }
  }, []);
  const [trialState, setTrialState] = useState(() => {
    const now = Date.now();
    const savedTrial = localStorage.getItem("autoflowng_trial");
    if (savedTrial) {
      try {
        const parsed = JSON.parse(savedTrial);
        if (parsed.expiresAt && parsed.startedAt) return parsed;
      } catch(e) {}
    }
    const startedAt = now;
    const expiresAt = startedAt + (TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const trialData = { startedAt, expiresAt, subscribed: false };
    localStorage.setItem("autoflowng_trial", JSON.stringify(trialData));
    return trialData;
  });

  const now = Date.now();
  const msLeft = trialState.expiresAt - now;
  const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60)));
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const isExpired = msLeft <= 0 && !trialState.subscribed;
  const isExpiringSoon = msLeft > 0 && msLeft < 24 * 60 * 60 * 1000;
  const isActive = msLeft > 0;
  const pctLeft = Math.max(0, Math.min(100, (msLeft / (TRIAL_DAYS * 24 * 60 * 60 * 1000)) * 100));

  function subscribe() {
    setTrialState(s => ({ ...s, subscribed: true }));
  }

  return { hoursLeft, minutesLeft, daysLeft, isExpired, isExpiringSoon, isActive, pctLeft, subscribed: trialState.subscribed, subscribe };
}

function TrialBanner({ hoursLeft, minutesLeft, daysLeft, isExpiringSoon, isExpired, pctLeft, onSubscribe, isMobile }) {
  if (isExpired) return null;
  const urgent = isExpiringSoon;
  const color = urgent ? C.rose : daysLeft >= 2 ? C.green : C.amber;
  const timeStr = daysLeft >= 1
    ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`
    : hoursLeft > 0
    ? `${hoursLeft}h ${minutesLeft}m left`
    : `${minutesLeft} minutes left`;

  return (
    <div style={{ background: urgent ? "rgba(251,113,133,0.08)" : "rgba(251,191,36,0.06)", borderBottom: `1px solid ${color}30`, padding: isMobile ? "10px 16px" : "10px 28px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{urgent ? "⚠️" : "🎁"}</span>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
            {urgent ? "Your free trial is ending soon — " : "Free trial active — "}
            <span style={{ color }}>{timeStr}</span>
          </span>
          {!isMobile && <span style={{ fontSize: 12, color: C.sub, marginLeft: 8 }}>Subscribe now to keep full access to all features.</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {!isMobile && (
          <div style={{ width: 80, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctLeft}%`, background: color, borderRadius: 3, transition: "width 1s ease" }} />
          </div>
        )}
        <button onClick={onSubscribe} style={{ background: color, color: "#fff", border: "none", borderRadius: 8, padding: isMobile ? "8px 14px" : "8px 18px", fontWeight: 800, fontSize: 12, fontFamily: "'Syne',sans-serif", cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Subscribe Now →
        </button>
      </div>
    </div>
  );
}

function TrialExpiredModal({ onSubscribe, isMobile }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const region = detectRegion();
  const isAfrica = region === "africa";
  const MODAL_PLANS = isAfrica ? [
    { name: "Starter",    price: "₦15,000", amount: 15000, color: C.sky,   currency:"NGN", features: ["3 platforms", "5 automations", "1,000 actions/mo"] },
    { name: "Business",   price: "₦30,000", amount: 30000, color: C.green, currency:"NGN", popular: true, features: ["All platforms", "Unlimited automations", "50,000 actions/mo", "AI agent"] },
    { name: "Enterprise", price: "₦50,000", amount: 50000, color: C.amber, currency:"NGN", features: ["Everything in Business", "Unlimited actions", "White-label"] },
  ] : [
    { name: "Starter",    price: "$49",  amount: 4900,  color: C.sky,   currency:"USD", features: ["3 platforms", "5 automations", "1,000 actions/mo"] },
    { name: "Business",   price: "$149", amount: 14900, color: C.green, currency:"USD", popular: true, features: ["All platforms", "Unlimited automations", "50,000 actions/mo", "AI agent"] },
    { name: "Enterprise", price: "$299", amount: 29900, color: C.amber, currency:"USD", features: ["Everything in Business", "Unlimited actions", "White-label"] },
  ];

  function pay() {
    if (!email || !selectedPlan) return;
    const key = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!key) { alert("Payment not configured. Please contact support."); return; }
    if (!window.PaystackPop) {
      const s = document.createElement('script');
      s.src = 'https://js.paystack.co/v1/inline.js';
      s.onload = () => pay();
      document.head.appendChild(s);
      return;
    }
    setPaying(true);
    // FIX: Use crypto.getRandomValues for secure reference generation
    const refBytes = new Uint8Array(6);
    crypto.getRandomValues(refBytes);
    const refChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const refSuffix = Array.from(refBytes).map(b => refChars[b % 32]).join("");
    const handler = window.PaystackPop.setup({
      key,
      email,
      amount: selectedPlan.amount * 100,
      currency: selectedPlan.currency || "NGN",
      ref: "AFN-" + Date.now() + "-" + refSuffix,
      metadata: { plan: selectedPlan.name, custom_fields: [{ display_name: "Plan", variable_name: "plan", value: selectedPlan.name }] },
      onSuccess: function(transaction) {
        // FIX: Use API_BASE instead of hardcoded URL
        fetch(`${API_BASE}/api/payments/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("autoflowng_token")||""}` },
          body: JSON.stringify({ reference: transaction.reference, email, plan: selectedPlan.name, amount: selectedPlan.amount })
        })
        .then(r => r.json())
        .then(data => {
          setPaying(false);
          if (data.status === "success") { setDone(true); setTimeout(onSubscribe, 2000); }
          else { alert("Payment verification failed. Contact support with ref: " + transaction.reference); }
        })
        .catch(() => { setPaying(false); alert("Network error. Contact support."); });
      },
      onCancel: function() { setPaying(false); }
    });
    handler.openIframe();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(4,6,15,0.97)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "auto" }}>
      {done ? (
        <div style={{ textAlign: "center", animation: "bounceIn 0.5s ease" }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Syne',sans-serif", marginBottom: 10, color: C.green }}>Welcome aboard!</div>
          <div style={{ fontSize: 16, color: C.sub }}>Your subscription is active. Full access restored!</div>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 680, animation: "popIn 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: isMobile ? 40 : 52, marginBottom: 16 }}>⏰</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.25)", borderRadius: 20, padding: "6px 16px", fontSize: 13, color: C.rose, marginBottom: 16, fontWeight: 700 }}>
              Free Trial Expired
            </div>
            <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, fontFamily: "'Syne',sans-serif", letterSpacing: "-0.03em", marginBottom: 10, color: C.ink }}>
              Your 3-day trial has ended
            </h2>
            <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
              We hope you loved AutoFlowNG! Choose a plan below to keep your automations running and never miss another lead or message.
            </p>
          </div>

          <div style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.18)", borderRadius: 14, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🔒</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.rose, marginBottom: 4 }}>Your access is paused</div>
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
                All your connected platforms, automations, and AI agent tasks are paused until you subscribe. Your data is safe and will be restored the moment you pick a plan.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 22 }}>
            {MODAL_PLANS.map(plan => (
              <div key={plan.name} onClick={() => setSelectedPlan(plan)} style={{ background: selectedPlan?.name === plan.name ? `${plan.color}12` : C.s1, border: `2px solid ${selectedPlan?.name === plan.name ? plan.color : C.border}`, borderRadius: 16, padding: "18px 16px", cursor: "pointer", transition: "all 0.2s", position: "relative" }}>
                {plan.popular && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#000", borderRadius: 20, padding: "3px 12px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>MOST POPULAR</div>}
                {selectedPlan?.name === plan.name && <div style={{ position: "absolute", top: 12, right: 12, width: 20, height: 20, borderRadius: "50%", background: plan.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 800 }}>✓</div>}
                <div style={{ fontSize: 11, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{plan.name}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: plan.color, fontFamily: "'Syne',sans-serif", letterSpacing: "-0.03em", marginBottom: 12 }}>{plan.price}<span style={{ fontSize: 12, color: C.sub, fontWeight: 400 }}>/mo</span></div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {plan.features.map(f => <li key={f} style={{ fontSize: 12, color: C.sub, display: "flex", gap: 6 }}><span style={{ color: plan.color }}>✓</span>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>

          {selectedPlan && (
            <div style={{ animation: "slideDown 0.25s ease" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.sub, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>Your Email Address</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@yourbusiness.com" onKeyDown={e => e.key === "Enter" && pay()} style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 11, padding: "13px 16px", color: C.ink, fontSize: 15, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = selectedPlan.color + "60"}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
              <div style={{ background: "rgba(0,200,150,0.06)", border: `1px solid rgba(0,200,150,0.16)`, borderRadius: 12, padding: "12px 16px", marginBottom: 14, fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
                🔒 Pay securely via <strong style={{ color: C.green }}>Paystack</strong> — Debit card, bank transfer, or USSD.
              </div>
              <button onClick={pay} disabled={!email || paying} style={{ width: "100%", background: email ? `linear-gradient(135deg,${selectedPlan.color},#0EA5E9)` : "rgba(255,255,255,0.06)", color: email ? "#fff" : C.sub, border: "none", borderRadius: 12, padding: "15px 0", fontWeight: 800, fontSize: 16, fontFamily: "'Syne',sans-serif", cursor: email ? "pointer" : "not-allowed", transition: "all 0.2s", boxShadow: email ? `0 4px 20px ${selectedPlan.color}40` : "none" }}>
                {paying ? "Processing payment..." : `Pay ${selectedPlan.price} & Restore Access →`}
              </button>
            </div>
          )}
          {!selectedPlan && (
            <div style={{ textAlign: "center", fontSize: 14, color: C.sub, padding: "8px 0" }}>
              ↑ Select a plan above to continue
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI STUDIO PAGE — Image · Video · Vision · Code · Translate
// ═══════════════════════════════════════════════════════════════
function AIStudioPage({ isMobile, toast }) {
  const [tab, setTab] = useState("image");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Image state
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgWidth, setImgWidth] = useState(1024);
  const [imgHeight, setImgHeight] = useState(1024);

  // Video state
  const [vidPrompt, setVidPrompt] = useState("");
  const [vidDuration, setVidDuration] = useState(4);
  const [vidRes, setVidRes] = useState("1080p");

  // Vision state
  const [visionFile, setVisionFile] = useState(null);
  const [visionPreview, setVisionPreview] = useState("");
  const [visionQ, setVisionQ] = useState("Describe this image in detail.");

  // Code state
  const [codePrompt, setCodePrompt] = useState("");
  const [codeLang, setCodeLang] = useState("JavaScript");
  const [codeTask, setCodeTask] = useState("generate");

  // Translate state
  const [transText, setTransText] = useState("");
  const [transLang, setTransLang] = useState("Spanish");

  // Capabilities state
  const [caps, setCaps] = useState(null);

  const tok = () => localStorage.getItem("autoflowng_token") || "";

  const TABS = [
    { id:"image",     icon:"🎨", label:"Image Gen" },
    { id:"video",     icon:"🎬", label:"Video Gen" },
    { id:"vision",    icon:"👁",  label:"Vision" },
    { id:"code",      icon:"💻", label:"Code" },
    { id:"translate", icon:"🌐", label:"Translate" },
    { id:"caps",      icon:"⚡", label:"Capabilities" },
  ];

  useEffect(() => {
    setResult(null); setError("");
  }, [tab]);

  useEffect(() => {
    if (tab === "caps" && !caps) {
      fetch(`${API_BASE}/api/autoflowng-ai/capabilities`, { headers:{ Authorization:`Bearer ${tok()}` } })
        .then(r => r.ok ? r.json() : null).then(d => d && setCaps(d)).catch(() => {});
    }
  }, [tab]);

  async function runImageGen() {
    if (!imgPrompt.trim()) { setError("Enter a prompt to generate an image."); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/autoflowng-ai/generate-image`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${tok()}`},
        body: JSON.stringify({ prompt: imgPrompt, width: imgWidth, height: imgHeight }),
      });
      const d = await r.json();
      if (d.url) { setResult(d); toast && toast("✅ Image generated!"); }
      else setError(d.error || "Image generation failed");
    } catch(e) { setError("Network error — please try again"); }
    setLoading(false);
  }

  async function runVideoGen() {
    if (!vidPrompt.trim()) { setError("Enter a prompt to generate a video."); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/autoflowng-ai/generate-video`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${tok()}`},
        body: JSON.stringify({ prompt: vidPrompt, duration: vidDuration, resolution: vidRes }),
      });
      const d = await r.json();
      if (d.url) { setResult(d); toast && toast("✅ Video frame generated!"); }
      else setError(d.error || "Video generation failed");
    } catch(e) { setError("Network error — please try again"); }
    setLoading(false);
  }

  async function runVision() {
    if (!visionFile && !visionPreview) { setError("Upload an image first."); return; }
    setLoading(true); setResult(null); setError("");
    try {
      let body;
      if (visionFile) {
        const reader = new FileReader();
        const b64 = await new Promise(res => { reader.onload = e => res(e.target.result.split(",")[1]); reader.readAsDataURL(visionFile); });
        body = { imageBase64: b64, mimeType: visionFile.type, question: visionQ };
      } else {
        body = { imageUrl: visionPreview, question: visionQ };
      }
      const r = await fetch(`${API_BASE}/api/autoflowng-ai/vision`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${tok()}`},
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.analysis) { setResult(d); toast && toast("✅ Image analysed!"); }
      else setError(d.error || "Vision analysis failed");
    } catch(e) { setError("Network error — please try again"); }
    setLoading(false);
  }

  async function runCode() {
    if (!codePrompt.trim()) { setError("Describe what code you need."); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/autoflowng-ai/code`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${tok()}`},
        body: JSON.stringify({ prompt: codePrompt, language: codeLang, task: codeTask }),
      });
      const d = await r.json();
      if (d.code) { setResult(d); toast && toast("✅ Code generated!"); }
      else setError(d.error || "Code generation failed");
    } catch(e) { setError("Network error — please try again"); }
    setLoading(false);
  }

  async function runTranslate() {
    if (!transText.trim()) { setError("Enter text to translate."); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const r = await fetch(`${API_BASE}/api/autoflowng-ai/translate`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${tok()}`},
        body: JSON.stringify({ text: transText, targetLanguage: transLang }),
      });
      const d = await r.json();
      if (d.translation) { setResult(d); toast && toast("✅ Translated!"); }
      else setError(d.error || "Translation failed");
    } catch(e) { setError("Network error — please try again"); }
    setLoading(false);
  }

  const inputStyle = {
    width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`,
    borderRadius:10, padding:"12px 14px", color:C.ink, fontSize:14, fontFamily:"'DM Sans',sans-serif",
    resize:"vertical",
  };
  const selStyle = { ...inputStyle, resize:"none", cursor:"pointer" };
  const btnStyle = (col=C.green) => ({
    background:col, color:"#fff", border:"none", borderRadius:10, padding:"12px 24px",
    fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", opacity:loading?0.6:1,
    fontFamily:"'Syne',sans-serif", letterSpacing:"0.01em",
  });

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,rgba(139,92,246,0.12),rgba(14,165,233,0.08))",border:`1px solid rgba(139,92,246,0.25)`,borderRadius:18,padding:isMobile?"18px":"24px 28px"}}>
        <div style={{fontSize:isMobile?18:22,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:6}}>✨ AutoFlowNG AI Studio</div>
        <div style={{fontSize:14,color:C.sub,lineHeight:1.6}}>
          Image generation · 4K video · Vision analysis · Code generation · Translation · 100+ languages
          <br/>Powered by Gemini · GPT-4 · Groq · DALL-E 3 · FLUX · Stability AI — with built-in fallbacks that always work.
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:tab===t.id?"rgba(139,92,246,0.2)":"rgba(255,255,255,0.04)",
            border:`1px solid ${tab===t.id?"rgba(139,92,246,0.5)":C.border}`,
            color:tab===t.id?C.violet:C.sub, borderRadius:10, padding:"8px 16px",
            fontSize:13, fontWeight:tab===t.id?700:500, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:6,
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Content area */}
      <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:18,padding:isMobile?"18px":"24px 28px",display:"flex",flexDirection:"column",gap:18}}>

        {/* IMAGE GENERATION */}
        {tab==="image" && <>
          <div style={{fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>🎨 AI Image Generation</div>
          <div style={{fontSize:13,color:C.sub}}>Powered by DALL-E 3 → Gemini Imagen 3 → Stability SDXL → Pollinations FLUX (free, always works)</div>
          <textarea rows={3} placeholder="Describe the image you want to create… e.g. 'A futuristic Nigerian city skyline at sunset, ultra detailed, 4K'" value={imgPrompt} onChange={e=>setImgPrompt(e.target.value)} style={inputStyle}/>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {[["Width",imgWidth,setImgWidth,["512","768","1024","1920","2048"]],["Height",imgHeight,setImgHeight,["512","768","1024","1920","2048"]]].map(([label,val,setter,opts])=>(
              <div key={label} style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:120}}>
                <div style={{fontSize:12,color:C.sub,fontFamily:"'DM Mono',monospace"}}>{label} (px)</div>
                <select value={val} onChange={e=>setter(Number(e.target.value))} style={selStyle}>
                  {opts.map(o=><option key={o} value={o}>{o}px</option>)}
                </select>
              </div>
            ))}
          </div>
          <button onClick={runImageGen} disabled={loading} style={btnStyle(C.violet)}>
            {loading ? "⏳ Generating image…" : "🎨 Generate Image"}
          </button>
        </>}

        {/* VIDEO GENERATION */}
        {tab==="video" && <>
          <div style={{fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>🎬 AI Video Generation</div>
          <div style={{fontSize:13,color:C.sub}}>Stability Video → Runway Gen-3 → Replicate CogVideoX → Pollinations FLUX Keyframe (free)</div>
          <div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:10,padding:"12px 14px",fontSize:13,color:C.amber}}>
            💡 Full 4K video generation requires STABILITY_API_KEY or RUNWAY_API_KEY. Without a key, a photorealistic 1080p AI keyframe is generated using the free FLUX model.
          </div>
          <textarea rows={3} placeholder="Describe your video… e.g. 'A drone flying over Lagos island at golden hour, 4K cinematic'" value={vidPrompt} onChange={e=>setVidPrompt(e.target.value)} style={inputStyle}/>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:120}}>
              <div style={{fontSize:12,color:C.sub,fontFamily:"'DM Mono',monospace"}}>Duration</div>
              <select value={vidDuration} onChange={e=>setVidDuration(Number(e.target.value))} style={selStyle}>
                {[2,3,4,5,6,8,10].map(s=><option key={s} value={s}>{s}s</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:120}}>
              <div style={{fontSize:12,color:C.sub,fontFamily:"'DM Mono',monospace"}}>Resolution</div>
              <select value={vidRes} onChange={e=>setVidRes(e.target.value)} style={selStyle}>
                {["720p","1080p","4k"].map(r=><option key={r} value={r}>{r==="4k"?"4K Ultra HD":r==="1080p"?"1080p Full HD":"720p HD"}</option>)}
              </select>
            </div>
          </div>
          <button onClick={runVideoGen} disabled={loading} style={btnStyle("#E1306C")}>
            {loading ? "⏳ Generating video…" : "🎬 Generate Video"}
          </button>
        </>}

        {/* VISION */}
        {tab==="vision" && <>
          <div style={{fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>👁 AI Vision — Image Analysis</div>
          <div style={{fontSize:13,color:C.sub}}>Gemini Vision → GPT-4o Vision → AutoFlowNG Local. Upload any image for deep AI analysis.</div>
          <div style={{border:`2px dashed ${C.border}`,borderRadius:12,padding:"20px",textAlign:"center",cursor:"pointer",position:"relative"}}
            onClick={()=>document.getElementById("visionFileInput").click()}>
            {visionPreview
              ? <img src={visionPreview} alt="preview" style={{maxHeight:200,borderRadius:8,maxWidth:"100%"}}/>
              : <div style={{color:C.sub,fontSize:13}}>📎 Click to upload image (JPG, PNG, WEBP, GIF)<br/><span style={{fontSize:11}}>or paste an image URL below</span></div>
            }
            <input id="visionFileInput" type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
              const f=e.target.files[0]; if(!f) return;
              setVisionFile(f);
              const reader=new FileReader(); reader.onload=ev=>setVisionPreview(ev.target.result); reader.readAsDataURL(f);
            }}/>
          </div>
          <input placeholder="Or paste image URL here…" value={visionFile?"":visionPreview} onChange={e=>{setVisionPreview(e.target.value);setVisionFile(null);}} style={{...inputStyle,resize:"none",borderRadius:10,padding:"10px 14px"}}/>
          <textarea rows={2} placeholder="What do you want to know? e.g. 'What text is in this image?' or 'What objects are visible?'" value={visionQ} onChange={e=>setVisionQ(e.target.value)} style={inputStyle}/>
          <button onClick={runVision} disabled={loading} style={btnStyle(C.sky)}>
            {loading ? "⏳ Analysing image…" : "👁 Analyse Image"}
          </button>
        </>}

        {/* CODE */}
        {tab==="code" && <>
          <div style={{fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>💻 AI Code Generation</div>
          <div style={{fontSize:13,color:C.sub}}>Generate, debug, or explain code in 15+ languages using Gemini, GPT-4, Groq, or the built-in engine.</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:140}}>
              <div style={{fontSize:12,color:C.sub,fontFamily:"'DM Mono',monospace"}}>Language</div>
              <select value={codeLang} onChange={e=>setCodeLang(e.target.value)} style={selStyle}>
                {["JavaScript","TypeScript","Python","React","Node.js","HTML/CSS","SQL","Rust","Go","Java","PHP","Swift","Kotlin","C++","Bash"].map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:140}}>
              <div style={{fontSize:12,color:C.sub,fontFamily:"'DM Mono',monospace"}}>Task</div>
              <select value={codeTask} onChange={e=>setCodeTask(e.target.value)} style={selStyle}>
                <option value="generate">Generate code</option>
                <option value="debug">Debug / fix code</option>
                <option value="explain">Explain code</option>
              </select>
            </div>
          </div>
          <textarea rows={5} placeholder={codeTask==="debug"?"Paste your buggy code here…":codeTask==="explain"?"Paste code to explain…":"Describe what you want to build… e.g. 'A REST API endpoint that saves a user to a PostgreSQL database'"} value={codePrompt} onChange={e=>setCodePrompt(e.target.value)} style={{...inputStyle,fontFamily:"'DM Mono',monospace",fontSize:13}}/>
          <button onClick={runCode} disabled={loading} style={btnStyle(C.amber)}>
            {loading ? "⏳ Generating code…" : `💻 ${codeTask==="debug"?"Fix Code":codeTask==="explain"?"Explain Code":"Generate Code"}`}
          </button>
        </>}

        {/* TRANSLATE */}
        {tab==="translate" && <>
          <div style={{fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>🌐 AI Translation — 100+ Languages</div>
          <div style={{fontSize:13,color:C.sub}}>Translate any text using Gemini, GPT-4, Groq, or the built-in engine. Supports African languages too.</div>
          <textarea rows={5} placeholder="Enter text to translate…" value={transText} onChange={e=>setTransText(e.target.value)} style={inputStyle}/>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:12,color:C.sub,fontFamily:"'DM Mono',monospace"}}>Translate to</div>
            <select value={transLang} onChange={e=>setTransLang(e.target.value)} style={selStyle}>
              {["Spanish","French","German","Portuguese","Chinese (Simplified)","Japanese","Korean","Arabic","Hindi","Swahili","Yoruba","Igbo","Hausa","Zulu","Amharic","Somali","Afrikaans","Russian","Italian","Dutch","Turkish","Polish","Swedish","Norwegian","Danish","Finnish","Greek","Hebrew","Thai","Vietnamese","Indonesian","Malay","Filipino","Bengali","Urdu","Persian","Ukrainian","Romanian","Hungarian","Czech","Slovak","Croatian","Bulgarian","Serbian","Slovenian","Estonian","Latvian","Lithuanian","Albanian","Macedonian","Bosnian","Montenegrin","Catalan","Basque","Welsh","Irish","Scottish Gaelic"].map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={runTranslate} disabled={loading} style={btnStyle(C.green)}>
            {loading ? "⏳ Translating…" : `🌐 Translate to ${transLang}`}
          </button>
        </>}

        {/* CAPABILITIES */}
        {tab==="caps" && <>
          <div style={{fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>⚡ AutoFlowNG AI Capabilities</div>
          {!caps ? (
            <div style={{color:C.sub,fontSize:13}}>Loading capabilities…</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:4}}>
                <div style={{background:"rgba(0,200,150,0.1)",border:"1px solid rgba(0,200,150,0.25)",borderRadius:8,padding:"6px 14px",fontSize:12,color:C.green}}>
                  🟢 {caps.active_tier_count} AI tiers active
                </div>
                <div style={{background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.25)",borderRadius:8,padding:"6px 14px",fontSize:12,color:C.sky}}>
                  🔒 Always-on: {caps.always_available?.join(" · ")}
                </div>
              </div>
              {Object.entries(caps.capabilities||{}).map(([key, cap]) => (
                <div key={key} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:4,textTransform:"capitalize"}}>{key.replace(/_/g," ")}</div>
                  <div style={{fontSize:12,color:C.sub,marginBottom:8}}>{cap.description}</div>
                  {cap.tiers && (
                    <div style={{display:"flex",flexDirection:"column",gap:5}}>
                      {cap.tiers.map((t,i) => (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                          <span style={{color:t.active?C.green:C.sub}}>{t.active?"✅":"⭕"}</span>
                          <span style={{color:t.active?C.ink:C.sub}}>{t.name}</span>
                          <span style={{color:C.sub,fontFamily:"'DM Mono',monospace",fontSize:11}}>
                            {t.free?"FREE":t.key!=="none"?`${t.key} required`:"built-in"}
                          </span>
                          {t.max_res && <span style={{color:C.sub,fontSize:11}}>max {t.max_res}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {cap.languages && <div style={{fontSize:12,color:C.sub,marginTop:4}}>{Array.isArray(cap.languages)?cap.languages.slice(0,8).join(" · ")+" …":""}</div>}
                </div>
              ))}
            </div>
          )}
        </>}

        {/* Error */}
        {error && <div style={{background:"rgba(251,113,133,0.1)",border:"1px solid rgba(251,113,133,0.3)",borderRadius:10,padding:"12px 14px",fontSize:13,color:C.rose}}>{error}</div>}

        {/* Results */}
        {result && tab==="image" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,color:C.green,fontWeight:700}}>✅ Generated via {result.tier}</div>
              <a href={result.url} download="autoflowng-image.png" target="_blank" rel="noopener noreferrer"
                style={{fontSize:12,color:C.sky,textDecoration:"none",border:`1px solid ${C.sky}`,borderRadius:8,padding:"5px 12px"}}>
                ⬇ Download
              </a>
            </div>
            <img src={result.url} alt="Generated" style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`,maxHeight:600,objectFit:"contain",background:"#000"}} loading="lazy"/>
            {result.note && <div style={{fontSize:12,color:C.amber,background:"rgba(251,191,36,0.08)",borderRadius:8,padding:"8px 12px"}}>{result.note}</div>}
          </div>
        )}

        {result && tab==="video" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,color:C.green,fontWeight:700}}>✅ Generated via {result.tier}</div>
              <a href={result.url} download="autoflowng-video.mp4" target="_blank" rel="noopener noreferrer"
                style={{fontSize:12,color:C.sky,textDecoration:"none",border:`1px solid ${C.sky}`,borderRadius:8,padding:"5px 12px"}}>
                ⬇ Download
              </a>
            </div>
            {result.url?.startsWith("data:video") ? (
              <video src={result.url} controls autoPlay loop style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`,maxHeight:500}}/>
            ) : (
              <img src={result.url} alt="Video keyframe" style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`,maxHeight:500,objectFit:"cover"}} loading="lazy"/>
            )}
            {result.note && <div style={{fontSize:12,color:C.amber,background:"rgba(251,191,36,0.08)",borderRadius:8,padding:"8px 12px"}}>{result.note}</div>}
            {result.type==="animated_preview"&&<div style={{fontSize:12,color:C.sub,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 12px"}}>🎬 Full video generation: add <span style={{fontFamily:"'DM Mono',monospace",color:C.amber}}>STABILITY_API_KEY</span> or <span style={{fontFamily:"'DM Mono',monospace",color:C.amber}}>RUNWAY_API_KEY</span> to your environment.</div>}
          </div>
        )}

        {result && tab==="vision" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:13,color:C.green,fontWeight:700}}>✅ Analysis by {result.tier}</div>
            <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",fontSize:14,lineHeight:1.8,color:C.ink,whiteSpace:"pre-wrap"}}>
              {result.analysis}
            </div>
          </div>
        )}

        {result && tab==="code" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,color:C.green,fontWeight:700}}>✅ {result.language} code ready</div>
              <button onClick={()=>{ navigator.clipboard?.writeText(result.code); toast&&toast("Copied!"); }}
                style={{fontSize:12,color:C.sky,background:"none",border:`1px solid ${C.sky}`,borderRadius:8,padding:"5px 12px",cursor:"pointer"}}>
                📋 Copy
              </button>
            </div>
            <pre style={{background:"rgba(0,0,0,0.4)",border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",fontSize:13,lineHeight:1.7,color:"#a8d8ea",fontFamily:"'DM Mono',monospace",overflowX:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
              {result.code}
            </pre>
          </div>
        )}

        {result && tab==="translate" && (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,color:C.green,fontWeight:700}}>✅ Translated to {result.targetLanguage}</div>
              <button onClick={()=>{ navigator.clipboard?.writeText(result.translation); toast&&toast("Copied!"); }}
                style={{fontSize:12,color:C.sky,background:"none",border:`1px solid ${C.sky}`,borderRadius:8,padding:"5px 12px",cursor:"pointer"}}>
                📋 Copy
              </button>
            </div>
            <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:12,padding:"16px",fontSize:15,lineHeight:1.8,color:C.ink,whiteSpace:"pre-wrap"}}>
              {result.translation}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP DASHBOARD
// ═══════════════════════════════════════════════════════════════
function AppDashboard({ onBack }) {
  const { mobile, tablet } = useBreakpoint();
  const [nav, setNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status: srvStatus, latency: srvLatency, watching: srvWatching, notifyWhenOnline, cancelNotify } = useServerStatus();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [platforms, setPlatforms] = useState(PLATFORMS.map(p=>({...p,connected:false})));
  const [connecting, setConnecting] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [refBalance, setRefBalance] = useState(0);
  const [userName, setUserName] = useState("My Business");
  const [userPlan, setUserPlan] = useState("trial");
  const [userCode, setUserCode] = useState(() => Sec.code());
  const [refHistory, setRefHistory] = useState([]);
  const [refStats, setRefStats] = useState({ total: 0, successful: 0, totalEarned: 0 });
  const [payments, setPayments] = useState([]);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [regionData] = useState(()=>detectRegionData());
  const [autoCount, setAutoCount] = useState(0);
  const [actionsToday, setActionsToday] = useState(0);

  useEffect(() => {
    const tok = localStorage.getItem("autoflowng_token") || "";
    if (!tok) return;
    fetch(`${API_BASE}/api/automations`, { headers: { "Authorization":`Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : { automations: [] })
      .then(d => setAutoCount((d.automations || []).filter(a => a.enabled).length))
      .catch(() => {});
    fetch(`${API_BASE}/api/analytics?range=7d`, { headers: { "Authorization":`Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.totalActions != null) setActionsToday(d.totalActions); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const trial = localStorage.getItem("autoflowng_trial");
    const reviewed = localStorage.getItem("autoflowng_reviewed");
    if (reviewed) return;
    if (trial) {
      try {
        const t = JSON.parse(trial);
        const trialEndedAgo = Date.now() - t.expiresAt;
        if (trialEndedAgo > 0 && trialEndedAgo < 7 * 24 * 60 * 60 * 1000) {
          setTimeout(() => setShowReviewPrompt(true), 3000);
        }
      } catch {}
    }
  }, []);

  // FIX: Use API_BASE instead of hardcoded URL
  useEffect(() => {
    fetch(`${API_BASE}/api/referrals/balance`, {
      headers: { "Authorization": `Bearer ${localStorage.getItem("autoflowng_token") || ""}` }
    })
    .then(r => r.ok ? r.json() : { balance: 0 })
    .then(d => { if (d.balance !== undefined) setRefBalance(d.balance); })
    .catch(() => setRefBalance(0));
  }, []);

  useEffect(() => {
    const tok = localStorage.getItem("autoflowng_token") || "";
    if (!tok) return;

    const gmailJustConnected = localStorage.getItem("autoflowng_gmail_just_connected");
    const slackJustConnected = localStorage.getItem("autoflowng_slack_just_connected");
    const twitterJustConnected = localStorage.getItem("autoflowng_twitter_just_connected");
    const oauthError = localStorage.getItem("autoflowng_oauth_error");

    if (oauthError) {
      localStorage.removeItem("autoflowng_oauth_error");
      setTimeout(() => toast(oauthError, C.rose), 500);
    }

    if (gmailJustConnected) {
      localStorage.removeItem("autoflowng_gmail_just_connected");
      setPlatforms(prev => prev.map(p => p.id === "gmail" ? {...p, connected: true, email: gmailJustConnected !== "true" ? gmailJustConnected : p.email} : p));
      setTimeout(() => toast(`Gmail connected${gmailJustConnected !== "true" ? ": " + gmailJustConnected : ""} ✓`, C.green), 400);
    }

    if (slackJustConnected) {
      localStorage.removeItem("autoflowng_slack_just_connected");
      setPlatforms(prev => prev.map(p => p.id === "slack" ? {...p, connected: true} : p));
      setTimeout(() => toast("Slack connected ✓", C.green), 400);
    }
    if (twitterJustConnected) {
      localStorage.removeItem("autoflowng_twitter_just_connected");
      setPlatforms(prev => prev.map(p => p.id === "twitter" ? {...p, connected: true, email: twitterJustConnected !== "true" ? twitterJustConnected : p.email} : p));
      setTimeout(() => toast(`Twitter/X connected${twitterJustConnected !== "true" ? ": " + twitterJustConnected : ""} ✓`, C.green), 400);
    }
    const facebookJustConnected = localStorage.getItem("autoflowng_facebook_just_connected");
    if (facebookJustConnected) {
      localStorage.removeItem("autoflowng_facebook_just_connected");
      setPlatforms(prev => prev.map(p => p.id === "facebook" ? {...p, connected: true} : p));
      setTimeout(() => toast("Facebook connected ✓", C.green), 400);
    }
    const instagramJustConnected = localStorage.getItem("autoflowng_instagram_just_connected");
    if (instagramJustConnected) {
      localStorage.removeItem("autoflowng_instagram_just_connected");
      setPlatforms(prev => prev.map(p => p.id === "instagram" ? {...p, connected: true} : p));
      setTimeout(() => toast("Instagram connected ✓", C.green), 400);
    }
    const linkedinJustConnected = localStorage.getItem("autoflowng_linkedin_just_connected");
    if (linkedinJustConnected) {
      localStorage.removeItem("autoflowng_linkedin_just_connected");
      setPlatforms(prev => prev.map(p => p.id === "linkedin" ? {...p, connected: true} : p));
      setTimeout(() => toast("LinkedIn connected ✓", C.green), 400);
    }

    // FIX: Use API_BASE for all backend fetches
    fetch(`${API_BASE}/api/connections`, {
      headers: { "Authorization": `Bearer ${tok}` }
    })
    .then(r => r.ok ? r.json() : { connections: [] })
    .then(d => {
      const connList = d.connections || [];
      setPlatforms(prev => prev.map(p => ({
        ...p,
        connected: connList.some(c => c.platform === p.id),
        email: connList.find(c => c.platform === p.id)?.platform_email || p.email
      })));
    })
    .catch(() => {});

    fetch(`${API_BASE}/api/auth/me`, { headers: { "Authorization": `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) {
          setUserName(d.user.name || "My Business");
          setUserPlan(d.user.plan || "trial");
          if (d.user.referral_code) setUserCode(d.user.referral_code);
        }
      }).catch(()=>{});

    fetch(`${API_BASE}/api/referrals`, { headers: { "Authorization": `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setRefBalance(d.balance || 0);
          if (d.referral_code) setUserCode(d.referral_code);
          const history = (d.referrals || []).map(r => ({
            n: r.referred_name || "User",
            d: new Date(r.created_at).toLocaleDateString("en-NG", { month:"short", day:"numeric", year:"numeric" }),
            s: r.status === "pending" ? "pending" : "paid"
          }));
          setRefHistory(history);
          setRefStats({
            total: d.referrals?.length || 0,
            successful: d.referrals?.filter(r=>r.status!=="pending").length || 0,
            totalEarned: (d.referrals?.filter(r=>r.status!=="pending").length || 0) * 1000
          });
        }
      }).catch(()=>{});

    fetch(`${API_BASE}/api/payments/history`, { headers: { "Authorization": `Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.payments) setPayments(d.payments); })
      .catch(()=>{});

  }, []);

  const isMobile = mobile || tablet;
  const trial = useTrialSystem();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const user = { name: userName || "My Business", plan: trial.subscribed ? "Business" : "Free Trial", code: userCode };

  function toast(msg, color=C.green) {
    const id = Date.now();
    setToasts(t=>[...t,{id,msg,color}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);
  }

  function connectPlatform(id) {
    const pl = platforms.find(p=>p.id===id);
    if (!pl) return;

    if (pl.connected) {
      setConnecting(id);
      fetch(`${API_BASE}/api/connections/${id}`, { method:"DELETE", headers:{"Authorization":`Bearer ${localStorage.getItem("autoflowng_token")||""}`} })
        .then(()=>{
          setPlatforms(p=>p.map(x=>x.id===id?{...x,connected:false}:x));
          toast(`${pl.name} disconnected`);
          setConnecting(null);
        }).catch(()=>{ setConnecting(null); });
    } else {
      const tok = localStorage.getItem("autoflowng_token") || "";
      if (id === "gmail") {
        window.location.href = `${API_BASE}/api/connect/gmail?token=${encodeURIComponent(tok)}`;
      } else if (id === "slack") {
        window.location.href = `${API_BASE}/api/connect/slack?token=${encodeURIComponent(tok)}`;
      } else if (id === "twitter") {
        window.location.href = `${API_BASE}/api/connect/twitter?token=${encodeURIComponent(tok)}`;
      } else if (id === "facebook") {
        window.location.href = `${API_BASE}/api/connect/facebook?token=${encodeURIComponent(tok)}`;
      } else if (id === "instagram") {
        window.location.href = `${API_BASE}/api/connect/instagram?token=${encodeURIComponent(tok)}`;
      } else if (id === "linkedin") {
        window.location.href = `${API_BASE}/api/connect/linkedin?token=${encodeURIComponent(tok)}`;
      } else if (id === "telegram") {
        toast("Use the Telegram bot link code in the Telegram section below.", C.sky);
      } else if (id === "whatsapp") {
        setShowWhatsappModal(true);
      } else if (id === "tiktok") {
        toast("TikTok content generation is active — full API posting coming soon! Your posts will be drafted and emailed to you.", C.amber);
      } else if (id === "outlook") {
        toast("Connect Gmail for full email automation. Outlook support via Microsoft OAuth is coming soon!", C.amber);
      } else {
        toast(`${pl.name} integration coming soon! 🚀`, C.amber);
      }
    }
  }

  const connected = platforms.filter(p=>p.connected);

  const NAV = [
    {id:"dashboard",icon:"◼",label:"Dashboard"},
    {id:"connections",icon:"🔗",label:"Connections"},
    {id:"automations",icon:"⚡",label:"Automations"},
    {id:"workflows",icon:"🔧",label:"Workflows"},
    {id:"agent",icon:"🤖",label:"AI Agent"},
    {id:"ai-studio",icon:"✨",label:"AI Studio"},
    {id:"knowledge",icon:"🧠",label:"Knowledge Hub"},
    {id:"referrals",icon:"🎁",label:"Referrals",badge:refBalance>0?`₦${(Number(refBalance)||0).toLocaleString('en-NG')}`:null},
    {id:"security",icon:"🛡",label:"Security"},
    {id:"analytics",icon:"📊",label:"Analytics"},
    {id:"billing",icon:"💳",label:"Billing"},
  ];

  const Sidebar = () => (
    <div style={{width:isMobile?"100%":224,background:C.s1,borderRight:isMobile?"none":`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"100%",flexShrink:0}}>
      <div onClick={()=>{ if(isMobile) setSidebarOpen(false); onBack(); }} style={{padding:"18px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <Logo size="sm"/>
      </div>
      <nav style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:2,overflowY:"auto"}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>{ setNav(n.id); if(isMobile)setSidebarOpen(false); }} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:11,border:"none",cursor:"pointer",fontSize:15,fontWeight:600,fontFamily:"'DM Sans',sans-serif",textAlign:"left",background:nav===n.id?"rgba(0,200,150,0.1)":"transparent",color:nav===n.id?C.green:C.sub,transition:"all 0.15s",position:"relative"}}>
            {nav===n.id&&<div style={{position:"absolute",left:0,top:"22%",bottom:"22%",width:3,borderRadius:2,background:C.green}}/>}
            <span style={{fontSize:15}}>{n.icon}</span>
            <span style={{flex:1}}>{n.label}</span>
            {n.badge&&<span style={{background:C.green,color:"#000",borderRadius:20,padding:"2px 7px",fontSize:10,fontWeight:800}}>{n.badge}</span>}
          </button>
        ))}
      </nav>
      <div style={{padding:"14px 18px",borderTop:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.amber},${C.green})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900,color:"#000",flexShrink:0}}>{user.name[0]}</div>
          <div style={{overflow:"hidden",flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
            <div style={{fontSize:15,color:trial.subscribed?C.green:trial.isExpiringSoon?C.rose:C.amber}}>
              {trial.subscribed ? "✓ Business Plan" : trial.isExpired ? "⚠ Trial Expired" : `🎁 Trial — ${trial.daysLeft > 0 ? trial.daysLeft+"d" : trial.hoursLeft+"h"} left`}
            </div>
          </div>
        </div>
        {!trial.subscribed && !trial.isExpired && (
          <button onClick={()=>setShowSubscribeModal(true)} style={{marginTop:10,width:"100%",background:trial.isExpiringSoon?C.rose:C.amber,color:"#fff",border:"none",borderRadius:8,padding:"9px 0",fontWeight:800,fontSize:15,fontFamily:"'Syne',sans-serif",cursor:"pointer",letterSpacing:"0.02em"}}>
            {trial.isExpiringSoon?"⚠ Subscribe Now":"Upgrade Plan"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,color:C.ink,fontFamily:"'DM Sans',sans-serif",overflow:"hidden",position:"relative"}}>
      <GlobalStyles/>

      <div style={{position:"fixed",top:isMobile?16:20,right:isMobile?16:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8,maxWidth:290}}>
        {toasts.map(t=>(
          <div key={t.id} style={{background:C.s2,border:`1px solid ${t.color}45`,padding:"12px 16px",borderRadius:12,fontSize:15,animation:"slideDown 0.3s ease",boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
            <span style={{color:t.color,marginRight:8}}>●</span>{t.msg}
          </div>
        ))}
      </div>

      {showWhatsappModal && (
        <WhatsAppConnectModal
          onClose={()=>setShowWhatsappModal(false)}
          onSuccess={(name)=>{ setPlatforms(p=>p.map(x=>x.id==="whatsapp"?{...x,connected:true,label:name}:x)); toast("WhatsApp Business connected! ✓"); setShowWhatsappModal(false); }}
          toast={toast}
        />
      )}

      {showWithdraw&&<WithdrawModal balance={refBalance} onClose={()=>setShowWithdraw(false)} onDone={()=>toast("Withdrawal submitted! Arrives in 24 hours 🎉")}/>}

      {showReviewPrompt && (
        <ReviewPrompt
          regionData={regionData}
          onClose={() => {
            setShowReviewPrompt(false);
            localStorage.setItem("autoflowng_reviewed", "true");
          }}
        />
      )}

      {trial.isExpired && !trial.subscribed && (
        <TrialExpiredModal
          isMobile={isMobile}
          onSubscribe={() => { trial.subscribe(); setShowSubscribeModal(false); toast("Subscription activated! Full access restored 🎉"); }}
        />
      )}

      {isMobile&&sidebarOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
          <div style={{width:260,background:C.s1,borderRight:`1px solid ${C.border}`,height:"100%",overflow:"hidden"}}><Sidebar/></div>
          <div style={{flex:1,background:"rgba(0,0,0,0.7)"}} onClick={()=>setSidebarOpen(false)}/>
        </div>
      )}

      {!isMobile&&<Sidebar/>}

      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <div style={{padding:isMobile?"14px 16px":"16px 28px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.s1,flexShrink:0,gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isMobile&&(
              <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:C.ink,fontSize:20,cursor:"pointer",padding:"4px 8px",flexShrink:0}}>☰</button>
            )}
            <div>
              <div style={{fontSize:isMobile?16:19,fontWeight:900,letterSpacing:"-0.025em",fontFamily:"'Syne',sans-serif",lineHeight:1}}>
                {{dashboard:"Dashboard",connections:"Connections",automations:"Automations",workflows:"Workflow Builder 🔧",agent:"AI Agent","ai-studio":"AI Studio ✨",knowledge:"Knowledge Hub",referrals:"Referral Program",security:"Security Center",analytics:"Analytics",billing:"Billing"}[nav]}
              </div>
              {!isMobile&&<div style={{fontSize:15,color:C.sub,marginTop:3}}>{new Date().toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
            <Chip color={C.green} dot>{connected.length} live</Chip>
            <ServerStatusBadge status={srvStatus} latency={srvLatency} compact />
            {(srvStatus === "waking" || srvStatus === "offline") && (
              <ServerNotifyButton
                watching={srvWatching}
                onWatch={() => notifyWhenOnline(() => {
                  toast("✅ Server is back online!", C.green);
                })}
                onCancel={cancelNotify}
                variant="header"
              />
            )}
          </div>
        </div>

        {!trial.subscribed && !trial.isExpired && (
          <TrialBanner
            hoursLeft={trial.hoursLeft}
            minutesLeft={trial.minutesLeft}
            daysLeft={trial.daysLeft}
            isExpiringSoon={trial.isExpiringSoon}
            isExpired={trial.isExpired}
            pctLeft={trial.pctLeft}
            onSubscribe={() => setNav("billing")}
            isMobile={isMobile}
          />
        )}

        <GlobalTimeClock isMobile={isMobile} />
        <div style={{flex:1,overflowY:"auto",padding:isMobile?"16px":"28px 32px"}}>

          {/* DASHBOARD */}
          {nav==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12}}>
                {[
                  {label:"Platforms",value:connected.length,col:C.sky},
                  {label:"Active Automations",value:autoCount,col:C.green},
                  {label:"Actions (7 days)",value:actionsToday.toLocaleString(),col:C.amber},
                  {label:"Referral Balance",value:`₦${Number(refBalance||0).toLocaleString('en-NG')}`,col:C.violet},
                ].map(s=>(
                  <div key={s.label} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:isMobile?"16px":"20px 22px"}}>
                    <div style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>{s.label}</div>
                    <div style={{fontSize:isMobile?24:30,fontWeight:900,color:s.col,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.025em",lineHeight:1}}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{background:`linear-gradient(135deg,rgba(0,200,150,0.06),rgba(14,165,233,0.04))`,border:`1px solid rgba(0,200,150,0.18)`,borderRadius:18,padding:isMobile?"20px":"28px 32px"}}>
                <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",gap:16}}>
                  <div>
                    <div style={{fontSize:isMobile?16:20,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:8}}>👋 Welcome to AutoFlowNG</div>
                    <div style={{fontSize:isMobile?13:14,color:C.sub,lineHeight:1.7,maxWidth:480}}>
                      {trial.subscribed
                        ? "Your AI automation workspace is ready. Connect platforms and activate automations to put your business on autopilot."
                        : `You have ${trial.daysLeft > 0 ? trial.daysLeft+" day"+( trial.daysLeft>1?"s":"") : trial.hoursLeft+"h "+trial.minutesLeft+"m"} of free access. Explore everything — then subscribe to keep it all running.`
                      }
                    </div>
                  </div>
                  <PBtn onClick={()=>setNav("connections")} lg>Connect First Platform →</PBtn>
                </div>
              </div>

              {!trial.subscribed && (
                <div style={{background:trial.isExpiringSoon?"rgba(251,113,133,0.07)":"rgba(251,191,36,0.06)",border:`1px solid ${trial.isExpiringSoon?"rgba(251,113,133,0.22)":"rgba(251,191,36,0.2)"}`,borderRadius:18,padding:isMobile?"18px":"22px 28px"}}>
                  <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",gap:16,flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontSize:isMobile?15:17,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:6,color:trial.isExpiringSoon?C.rose:C.amber}}>
                        {trial.isExpiringSoon?"⚠️ Trial ending soon!":"🎁 Free Trial Active"}
                      </div>
                      <div style={{fontSize:15,color:C.sub,lineHeight:1.7,maxWidth:440}}>
                        {trial.isExpiringSoon
                          ? `Only ${trial.hoursLeft}h ${trial.minutesLeft}m remaining. Subscribe now to keep your automations running without interruption.`
                          : `You have ${trial.daysLeft} day${trial.daysLeft>1?"s":""} of free access to all features. No payment needed until your trial ends.`
                        }
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:isMobile?"flex-start":"flex-end",flexShrink:0}}>
                      <div style={{display:"flex",gap:8}}>
                        {[
                          {v:String(trial.daysLeft).padStart(2,"0"),l:"Days"},
                          {v:String(trial.hoursLeft%24).padStart(2,"0"),l:"Hours"},
                          {v:String(trial.minutesLeft).padStart(2,"0"),l:"Mins"},
                        ].map(c=>(
                          <div key={c.l} style={{background:"rgba(0,0,0,0.25)",borderRadius:10,padding:"10px 14px",textAlign:"center",minWidth:52}}>
                            <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",color:trial.isExpiringSoon?C.rose:C.amber,letterSpacing:"-0.02em"}}>{c.v}</div>
                            <div style={{fontSize:10,color:C.sub}}>{c.l}</div>
                          </div>
                        ))}
                      </div>
                      <PBtn onClick={()=>setNav("billing")} color={trial.isExpiringSoon?C.rose:C.amber}>Subscribe Now →</PBtn>
                    </div>
                  </div>
                  <div style={{marginTop:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:15,color:C.sub,fontFamily:"'DM Mono',monospace"}}>Trial Progress</span>
                      <span style={{fontSize:15,color:C.sub,fontFamily:"'DM Mono',monospace"}}>{Math.round(100-trial.pctLeft)}% used</span>
                    </div>
                    <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${100-trial.pctLeft}%`,background:`linear-gradient(90deg,${C.green},${trial.isExpiringSoon?C.rose:C.amber})`,borderRadius:3,transition:"width 1s ease"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                      <span style={{fontSize:15,color:C.sub}}>Day 1</span>
                      <span style={{fontSize:15,color:C.sub}}>Day 3</span>
                    </div>
                  </div>
                </div>
              )}
              <div style={{background:`linear-gradient(135deg,rgba(251,191,36,0.07),rgba(167,139,250,0.05))`,border:`1px solid rgba(251,191,36,0.2)`,borderRadius:18,padding:isMobile?"18px":"22px 28px",display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",gap:16}}>
                <div>
                  <div style={{fontSize:isMobile?15:17,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:4}}>🎁 You have ₦{Number(refBalance||0).toLocaleString('en-NG')} to withdraw</div>
                  <div style={{fontSize:15,color:C.sub}}>From your referral earnings. Withdraw directly to your bank account.</div>
                </div>
                <PBtn onClick={()=>setNav("referrals")}>View Referrals →</PBtn>
              </div>
            </div>
          )}

          {/* CONNECTIONS */}
          {nav==="connections"&&(
            <div>
              <div style={{display:"flex",gap:10,marginBottom:22,flexWrap:"wrap"}}>
                <Chip color={C.green} dot>{connected.length} connected</Chip>
                <Chip color={C.sky}>{PLATFORMS.length-connected.length} available</Chip>
              </div>
              {["Email","Messaging","Social"].map(cat=>(
                <div key={cat} style={{marginBottom:24}}>
                  <div style={{fontSize:15,color:C.sub,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12,fontFamily:"'DM Mono',monospace"}}>{cat}</div>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
                    {platforms.filter(p=>p.cat===cat).map(p=>(
                      <div key={p.id} style={{background:C.s1,border:`1px solid ${p.connected?p.color+"55":C.border}`,borderRadius:16,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,transition:"all 0.2s",boxShadow:p.connected?`0 4px 20px ${p.color}15`:"none"}}>
                        <PlatformTile id={p.id} size={46}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:800,fontSize:15,marginBottom:4,fontFamily:"'Syne',sans-serif"}}>{p.name}</div>
                          <div style={{fontSize:15,color:p.connected?C.green:C.sub,display:"flex",alignItems:"center",gap:5}}>
                            {p.connected&&<span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",animation:"glw 2s ease infinite"}}/>}
                            {p.connected?"Connected":"Not connected"}
                          </div>
                        </div>
                        <button onClick={()=>connectPlatform(p.id)} style={{
                          background: p.connected ? "transparent" : PLATFORM_BTN_BG[p.id] || p.color,
                          color: p.connected ? C.sub : PLATFORM_BTN_TEXT[p.id] || "#fff",
                          border: `1.5px solid ${p.connected ? C.border : PLATFORM_BTN_BG[p.id] || p.color}`,
                          borderRadius:10, padding:"9px 18px", fontSize:15, fontWeight:800,
                          fontFamily:"'Syne',sans-serif", cursor:"pointer", minWidth:100,
                          transition:"all 0.2s", flexShrink:0,
                          opacity: connecting===p.id ? 0.7 : 1,
                        }}>
                          {connecting===p.id ? "Connecting..." : p.connected ? "Disconnect" : "Connect"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* REFERRALS */}
          {nav==="referrals"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{background:`linear-gradient(135deg,rgba(0,200,150,0.07),rgba(14,165,233,0.04))`,border:`1px solid rgba(0,200,150,0.2)`,borderRadius:20,padding:isMobile?"20px":"28px"}}>
                <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"flex-start":"flex-start",gap:16,marginBottom:22}}>
                  <div>
                    <Chip color={C.green}>Referral Program</Chip>
                    <div style={{fontSize:isMobile?20:24,fontWeight:900,fontFamily:"'Syne',sans-serif",marginTop:12,marginBottom:6}}>Earn ₦1,000 Per Referral</div>
                    <div style={{fontSize:15,color:C.sub,maxWidth:400}}>Share your link. Every person who subscribes earns you ₦1,000 — paid to your bank account.</div>
                  </div>
                  <div style={{textAlign:isMobile?"left":"right",flexShrink:0}}>
                    <div style={{fontSize:15,color:C.sub,marginBottom:4,fontFamily:"'DM Mono',monospace"}}>AVAILABLE BALANCE</div>
                    <div style={{fontSize:isMobile?32:40,fontWeight:900,color:C.green,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.03em"}}>₦{Number(refBalance||0).toLocaleString('en-NG')}</div>
                    {refBalance>=1000&&<div style={{marginTop:10}}><PBtn onClick={()=>setShowWithdraw(true)}>Withdraw →</PBtn></div>}
                  </div>
                </div>
                {/* FIX: Use real refStats from API instead of hardcoded fake numbers */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:22}}>
                  {[
                    [String(refStats.total),"Total Referrals"],
                    [String(refStats.successful),"Successful"],
                    [refStats.totalEarned>0?`₦${refStats.totalEarned.toLocaleString("en-NG")}`:"₦0","Total Earned"]
                  ].map(([v,l])=>(
                    <div key={l} style={{background:"rgba(0,0,0,0.2)",borderRadius:12,padding:isMobile?"12px":"14px 16px",textAlign:"center"}}>
                      <div style={{fontSize:isMobile?20:24,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{v}</div>
                      <div style={{fontSize:15,color:C.sub,marginTop:4}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:15,color:C.sub,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>Your Referral Code</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:180,background:"rgba(0,0,0,0.3)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 18px",fontFamily:"'DM Mono',monospace",fontSize:isMobile?16:20,fontWeight:800,color:C.green,letterSpacing:"0.1em"}}>{user.code}</div>
                    <button onClick={()=>navigator.clipboard.writeText(`${APP_URL}/ref/${user.code}`).then(()=>toast("Referral link copied! 🔗"))} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,color:C.sub,borderRadius:10,padding:"12px 16px",fontWeight:700,fontSize:15,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",whiteSpace:"nowrap"}}>Copy Link</button>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <a href={`https://wa.me/?text=${encodeURIComponent("Automate your business with AutoFlowNG! "+APP_URL+"/ref/"+user.code)}`} target="_blank" rel="noopener noreferrer" style={{background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.28)",color:"#25D366",borderRadius:10,padding:"9px 16px",fontWeight:700,fontSize:15,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>
                    <PlatformLogo id="whatsapp" size={16}/>
                    Share on WhatsApp
                  </a>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Automating my business with AutoFlowNG! "+APP_URL+"/ref/"+user.code)}`} target="_blank" rel="noopener noreferrer" style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,color:C.ink,borderRadius:10,padding:"9px 16px",fontWeight:700,fontSize:15,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>
                    <PlatformLogo id="twitter" size={16}/>
                    Share on Twitter
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL+"/ref/"+user.code)}`} target="_blank" rel="noopener noreferrer" style={{background:"rgba(24,119,242,0.1)",border:"1px solid rgba(24,119,242,0.28)",color:"#1877F2",borderRadius:10,padding:"9px 16px",fontWeight:700,fontSize:15,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>
                    <PlatformLogo id="facebook" size={16}/>
                    Share on Facebook
                  </a>
                </div>
              </div>

              <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden"}}>
                <div style={{padding:"16px 22px",borderBottom:`1px solid ${C.border}`,fontWeight:800,fontSize:15,fontFamily:"'Syne',sans-serif"}}>Referral History</div>
                {(refHistory||[]).length===0 ? (
                  <div style={{textAlign:"center",padding:"40px 20px",color:C.sub}}>
                    <div style={{fontSize:40,marginBottom:12}}>🎁</div>
                    <div style={{fontSize:16,fontWeight:700,color:C.ink,marginBottom:8}}>No referrals yet</div>
                    <div style={{fontSize:15}}>Share your referral link and earn ₦1,000 for each person who subscribes!</div>
                  </div>
                ) : (refHistory||[]).map((r,i)=>(
                  <div key={i} style={{padding:"14px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(0,200,150,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:C.green,flexShrink:0}}>{r.n[0]}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.n}</div>
                        <div style={{fontSize:15,color:C.sub}}>{r.d}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{fontWeight:800,color:r.s==="paid"?C.green:C.amber,fontSize:15}}>{r.s==="paid"?"+₦1,000":"Pending"}</span>
                      <Chip color={r.s==="paid"?C.green:C.amber}>{r.s==="paid"?"Paid":"Pending"}</Chip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY */}
          {nav==="security"&&(
            <SecurityPage isMobile={isMobile} user={user} toast={toast}/>
          )}

          {nav==="automations"&&(
            <AutomationsPage isMobile={isMobile} connected={connected} onConnect={()=>setNav("connections")} toast={toast}/>
          )}

          {nav==="workflows"&&(
            <WorkflowBuilderPage isMobile={isMobile} connected={connected} toast={toast}/>
          )}

          {nav==="agent"&&(
            <AgentPage isMobile={isMobile} connected={connected} onConnect={()=>setNav("connections")}/>
          )}

          {nav==="ai-studio"&&(
            <AIStudioPage isMobile={isMobile} toast={toast}/>
          )}

          {nav==="knowledge"&&(
            <KnowledgePage isMobile={isMobile}/>
          )}

          {nav==="analytics"&&(
            <AnalyticsPage isMobile={isMobile} connected={connected} onConnect={()=>setNav("connections")}/>
          )}

          {nav==="billing"&&(
            <BillingPage isMobile={isMobile} trial={trial} onUpgrade={(planName)=>{ trial.subscribe(); toast(`🎉 Subscribed to ${planName} plan! Full access activated.`, C.green); }}/>
          )}

        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECURITY PAGE
// ═══════════════════════════════════════════════════════════════
function SecurityPage({ isMobile, user, toast }) {
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [showPwdForm, setShowPwdForm] = useState(false);

  async function changePassword() {
    setPwdError(""); setPwdSuccess("");
    if (!curPwd || !newPwd || !confPwd) { setPwdError("All fields are required."); return; }
    if (newPwd.length < 6) { setPwdError("New password must be at least 6 characters."); return; }
    if (newPwd !== confPwd) { setPwdError("New passwords do not match."); return; }
    setPwdLoading(true);
    try {
      const tok = localStorage.getItem("autoflowng_token") || "";
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${tok}` },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error || "Failed to change password.");
      } else {
        setPwdSuccess("Password changed successfully! ✅");
        setCurPwd(""); setNewPwd(""); setConfPwd("");
        setTimeout(() => { setShowPwdForm(false); setPwdSuccess(""); }, 2500);
        if (toast) toast("Password changed successfully! 🔐");
      }
    } catch {
      setPwdError("Connection error. Please try again.");
    }
    setPwdLoading(false);
  }

  const inpStyle = { width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", color:C.ink, fontSize:14, outline:"none", boxSizing:"border-box" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ background:`linear-gradient(135deg,rgba(0,200,150,0.06),rgba(56,189,248,0.04))`, border:`1px solid rgba(0,200,150,0.2)`, borderRadius:18, padding:isMobile?"18px":"22px 26px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
        <div style={{ fontSize:36 }}>🛡</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:17, fontWeight:900, fontFamily:"'Syne',sans-serif", marginBottom:4 }}>Your Account is Protected</div>
          <div style={{ fontSize:14, color:C.sub }}>Security layers are active and monitoring your account. Last login: just now.</div>
        </div>
        <Chip color={C.green} dot>Protected</Chip>
      </div>

      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:3 }}>🔑 Change Password</div>
            <div style={{ fontSize:14, color:C.sub }}>Update your account password. You'll need your current password to confirm.</div>
          </div>
          <button onClick={()=>{ setShowPwdForm(v=>!v); setPwdError(""); setPwdSuccess(""); }} style={{ background:showPwdForm?"transparent":C.green, color:showPwdForm?C.sub:"#000", border:`1px solid ${showPwdForm?C.border:C.green}`, borderRadius:10, padding:"9px 18px", fontSize:14, fontWeight:800, fontFamily:"'Syne',sans-serif", cursor:"pointer", transition:"all 0.15s" }}>
            {showPwdForm ? "Cancel" : "Change Password"}
          </button>
        </div>
        {showPwdForm && (
          <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:14, animation:"slideDown 0.2s ease" }}>
            {pwdError && <div style={{ background:"rgba(251,113,133,0.08)", border:"1px solid rgba(251,113,133,0.25)", borderRadius:9, padding:"10px 14px", color:C.rose, fontSize:14 }}>{pwdError}</div>}
            {pwdSuccess && <div style={{ background:"rgba(0,200,150,0.08)", border:"1px solid rgba(0,200,150,0.25)", borderRadius:9, padding:"10px 14px", color:C.green, fontSize:14 }}>{pwdSuccess}</div>}
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
              {[
                { label:"Current Password", val:curPwd, set:setCurPwd },
                { label:"New Password",     val:newPwd, set:setNewPwd },
                { label:"Confirm New",      val:confPwd, set:setConfPwd },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize:12, color:C.sub, marginBottom:6, letterSpacing:"0.04em" }}>{f.label}</div>
                  <input type="password" value={f.val} onChange={e=>f.set(e.target.value)} placeholder="••••••••" disabled={pwdLoading} style={{ ...inpStyle, opacity:pwdLoading?0.6:1 }}
                    onFocus={e=>e.target.style.borderColor=`${C.green}60`}
                    onBlur={e=>e.target.style.borderColor=C.border}
                  />
                </div>
              ))}
            </div>
            <div>
              <button onClick={changePassword} disabled={pwdLoading||!curPwd||!newPwd||!confPwd} style={{ background:(!curPwd||!newPwd||!confPwd||pwdLoading)?"rgba(255,255,255,0.06)":C.green, color:(!curPwd||!newPwd||!confPwd||pwdLoading)?C.sub:"#000", border:"none", borderRadius:10, padding:"11px 24px", fontSize:14, fontWeight:800, fontFamily:"'Syne',sans-serif", cursor:(!curPwd||!newPwd||!confPwd||pwdLoading)?"default":"pointer", transition:"all 0.15s" }}>
                {pwdLoading ? "Changing…" : "Update Password"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(280px,1fr))", gap:12 }}>
        {[
          { icon:"🔐", t:"Encrypted Storage",    d:"Your data is encrypted in transit (HTTPS/TLS) and at rest. Credentials are never stored in plain text.", c:C.green },
          { icon:"🚦", t:"Rate Limiting",         d:"After 5 failed login attempts, your account is temporarily locked and you are notified immediately.",    c:C.sky },
          { icon:"🧹", t:"Input Sanitization",   d:"Every form input is cleaned before processing. XSS and SQL injection attacks are blocked automatically.", c:C.amber },
          { icon:"🔒", t:"Secure Sessions",       d:"JWT session tokens expire and rotate. Signing out from any device immediately invalidates the token.",    c:C.violet },
          { icon:"👁", t:"Anomaly Detection",    d:"Rate limiting and pattern monitoring flag suspicious login attempts and abnormal referral activity.",       c:C.rose },
          { icon:"🔑", t:"OAuth 2.0 Only",        d:"We never store your Gmail, Instagram, or WhatsApp passwords. All connections use official OAuth.",        c:C.green },
        ].map(m => (
          <div key={m.t} style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?"16px":"20px 22px", display:"flex", gap:14, alignItems:"flex-start", transition:"border-color 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=m.c+"35"}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
          >
            <div style={{ width:38, height:38, borderRadius:10, background:m.c+"12", border:`1px solid ${m.c}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{m.icon}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, marginBottom:5, fontFamily:"'Syne',sans-serif" }}>{m.t}</div>
              <div style={{ fontSize:13, color:C.sub, lineHeight:1.65 }}>{m.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background:"rgba(251,113,133,0.04)", border:`1px solid rgba(251,113,133,0.14)`, borderRadius:14, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.rose, marginBottom:4 }}>⚠️ Danger Zone</div>
          <div style={{ fontSize:13, color:C.sub }}>Delete your account and all associated data. This action is permanent and cannot be undone.</div>
        </div>
        <button onClick={()=>toast("To delete your account, please contact support@autoflowng.com")} style={{ background:"transparent", border:`1px solid ${C.rose}40`, color:C.rose, borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>Delete Account</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RUN RESULTS MODAL — Make.com-style step-by-step execution log
// ═══════════════════════════════════════════════════════════════
const ACTION_META = {
  gmail_replied:      { icon:"✉️",  label:"Gmail Reply Sent",         color:"#EA4335" },
  fb_replied:         { icon:"💬",  label:"Facebook Reply Sent",       color:"#1877F2" },
  telegram_notified:  { icon:"✈️",  label:"Telegram Notification",     color:"#2AABEE" },
  telegram_sent:      { icon:"✈️",  label:"Telegram Message Sent",     color:"#2AABEE" },
  tweet_posted:       { icon:"🐦",  label:"Tweet Published",           color:"#1D9BF0" },
  fb_posted:          { icon:"📘",  label:"Facebook Post Published",   color:"#1877F2" },
  fb_notified:        { icon:"📘",  label:"Facebook Notified",         color:"#1877F2" },
  fb_monitoring:      { icon:"👁",  label:"Facebook Page Monitored",   color:"#1877F2" },
  linkedin_posted:    { icon:"💼",  label:"LinkedIn Post Published",   color:"#0A66C2" },
  linkedin_drafted:   { icon:"💼",  label:"LinkedIn Draft Ready",      color:"#0A66C2" },
  slack_posted:       { icon:"💬",  label:"Slack Message Posted",      color:"#611F69" },
  whatsapp_drafted:   { icon:"📱",  label:"WhatsApp Message Drafted",  color:"#25D366" },
  whatsapp_ready:     { icon:"📱",  label:"WhatsApp Template Active",  color:"#25D366" },
  lead_captured:      { icon:"🎯",  label:"Lead Captured",             color:"#00C896" },
  digest_emailed:     { icon:"📧",  label:"Lead Digest Emailed",       color:"#EA4335" },
  sequence_sent:      { icon:"📨",  label:"Sequence Email Sent",       color:"#8B5CF6" },
  template_sent:      { icon:"📄",  label:"Template Sent to Inbox",    color:"#8B5CF6" },
  followup_sent:      { icon:"🔄",  label:"Follow-Up Sent",            color:"#F59E0B" },
  templates_generated:{ icon:"🛡",  label:"Templates Generated",       color:"#00C896" },
  emailed:            { icon:"📧",  label:"Emailed to You",            color:"#EA4335" },
  email_template:     { icon:"📧",  label:"Template Emailed",          color:"#EA4335" },
  email_sent:         { icon:"📧",  label:"Email Sent",                color:"#EA4335" },
  calendar_emailed:   { icon:"📅",  label:"Content Calendar Emailed",  color:"#38BDF8" },
  content_generated:  { icon:"✍️",  label:"Content Generated",         color:"#A78BFA" },
  report_emailed:     { icon:"📊",  label:"Report Emailed",            color:"#F59E0B" },
  report_generated:   { icon:"📊",  label:"Report Generated",          color:"#F59E0B" },
  reminder_sent:      { icon:"💰",  label:"Payment Reminder Sent",     color:"#10B981" },
  template_created:   { icon:"📄",  label:"Template Created",          color:"#10B981" },
  template_ready:     { icon:"📄",  label:"Template Ready",            color:"#10B981" },
  telegram_sent:      { icon:"✈️",  label:"Telegram Sent",             color:"#2AABEE" },
  mention_found:      { icon:"🔍",  label:"Mention Found",             color:"#F59E0B" },
  reply_templates:    { icon:"⭕",  label:"Reply Templates Generated", color:"#EC4899" },
  info:               { icon:"ℹ️",  label:"Info",                       color:"#6B7280" },
  error:              { icon:"⚠️",  label:"Error",                      color:"#EF4444" },
};

function RunResultsModal({ result, templateName, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  const { success, summary, actions = [], duration_ms } = result;

  function copyAll() {
    const text = `AutoFlowNG Run Results — ${templateName}\n\n${summary}\n\n${actions.map(a => {
      const m = ACTION_META[a.type] || { icon:"•", label:a.type };
      return `${m.icon} ${m.label}${a.platform?" ["+a.platform+"]":""}${a.preview?"\n   Preview: "+a.preview:""}${a.note?"\n   Note: "+a.note:""}`;
    }).join("\n")}\n\nCompleted in ${((duration_ms||0)/1000).toFixed(1)}s`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false), 2000); });
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0D1F1A",border:`1px solid ${success?"#00C89640":"#EF444440"}`,borderRadius:22,padding:"28px 24px",width:"100%",maxWidth:560,animation:"popIn 0.28s cubic-bezier(0.16,1,0.3,1)",maxHeight:"85vh",overflowY:"auto",boxSizing:"border-box"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:success?"#00C896":"#EF4444",boxShadow:`0 0 8px ${success?"#00C896":"#EF4444"}`,flexShrink:0}}/>
              <span style={{fontSize:18,fontWeight:900,fontFamily:"'Syne',sans-serif",color:success?"#00C896":"#EF4444"}}>{success?"Run Completed":"Run Failed"}</span>
            </div>
            <div style={{fontSize:13,color:"#94A3B8",fontFamily:"'DM Mono',monospace"}}>{templateName} · {((duration_ms||0)/1000).toFixed(1)}s</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#94A3B8",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
        </div>

        {/* Summary */}
        <div style={{background:success?"rgba(0,200,150,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${success?"rgba(0,200,150,0.2)":"rgba(239,68,68,0.2)"}`,borderRadius:12,padding:"12px 16px",marginBottom:20}}>
          <div style={{fontSize:15,color:success?"#6EE7B7":"#FCA5A5",lineHeight:1.6}}>{summary}</div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,color:"#64748B",fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Execution Steps ({actions.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {actions.map((action, i) => {
                const meta = ACTION_META[action.type] || { icon:"•", label:action.type, color:"#94A3B8" };
                const isError = action.type === "error";
                return (
                  <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",background:"rgba(255,255,255,0.03)",border:`1px solid ${isError?"rgba(239,68,68,0.2)":"rgba(255,255,255,0.06)"}`,borderRadius:10,padding:"10px 14px",borderLeft:`3px solid ${isError?"#EF4444":meta.color}`}}>
                    <div style={{fontSize:18,flexShrink:0,lineHeight:1.2,marginTop:1}}>{meta.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:2}}>
                        <span style={{fontSize:13,fontWeight:700,color:isError?"#FCA5A5":meta.color}}>{meta.label}</span>
                        {action.platform && <span style={{fontSize:11,color:"#64748B",fontFamily:"'DM Mono',monospace",background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 6px"}}>{action.platform}</span>}
                        {action.page && <span style={{fontSize:11,color:"#64748B",fontFamily:"'DM Mono',monospace",background:"rgba(255,255,255,0.05)",borderRadius:4,padding:"1px 6px"}}>{action.page}</span>}
                        {action.step && <span style={{fontSize:11,color:"#A78BFA",fontFamily:"'DM Mono',monospace",background:"rgba(167,139,250,0.1)",borderRadius:4,padding:"1px 6px"}}>{action.step}</span>}
                      </div>
                      {(action.to || action.contact) && <div style={{fontSize:12,color:"#94A3B8",marginBottom:2}}>→ {action.to || action.contact}</div>}
                      {action.subject && <div style={{fontSize:12,color:"#64748B",marginBottom:2,fontStyle:"italic"}}>"{action.subject?.slice(0,60)}"</div>}
                      {action.preview && <div style={{fontSize:12,color:"#94A3B8",lineHeight:1.5,marginTop:2,background:"rgba(255,255,255,0.03)",borderRadius:6,padding:"6px 8px",fontFamily:"'DM Sans',sans-serif"}}>{action.preview}</div>}
                      {action.note && <div style={{fontSize:12,color:isError?"#FCA5A5":"#64748B",marginTop:2}}>{action.note}</div>}
                      {action.name && <div style={{fontSize:12,color:"#00C896",marginTop:2,fontWeight:600}}>{action.name}</div>}
                      {action.text && <div style={{fontSize:12,color:"#94A3B8",marginTop:2,background:"rgba(255,255,255,0.03)",borderRadius:6,padding:"6px 8px",fontStyle:"italic"}}>"{action.text}"</div>}
                    </div>
                    <div style={{fontSize:11,color:"#475569",fontFamily:"'DM Mono',monospace",flexShrink:0,marginTop:2}}>✓</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{display:"flex",gap:10,borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:16}}>
          <button onClick={copyAll} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:copied?"#00C896":"#94A3B8",borderRadius:10,padding:"10px 16px",fontSize:13,cursor:"pointer",fontFamily:"'DM Mono',monospace",transition:"all 0.2s"}}>
            {copied ? "✓ Copied!" : "📋 Copy Full Log"}
          </button>
          <button onClick={onClose} style={{flex:1,background:"#00C896",border:"none",color:"#04221A",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Syne',sans-serif"}}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp Business Manual Connect Modal ──────────────────────
function WhatsAppConnectModal({ onClose, onSuccess, toast }) {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast("Phone Number ID and Access Token are required.", "#EF4444");
      return;
    }
    setSaving(true);
    try {
      const tok = localStorage.getItem("autoflowng_token") || "";
      const res = await fetch(`${API_BASE}/api/connect/whatsapp`, {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${tok}`},
        body: JSON.stringify({ phoneNumberId: phoneNumberId.trim(), accessToken: accessToken.trim(), businessName: businessName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess(businessName.trim() || "WhatsApp Business");
      } else {
        toast(data.error || "Connection failed. Check your credentials.", "#EF4444");
      }
    } catch { toast("Network error. Please try again.", "#EF4444"); }
    setSaving(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0D1F1A",border:"1px solid rgba(0,200,150,0.25)",borderRadius:22,padding:"28px 24px",width:"100%",maxWidth:480,animation:"popIn 0.28s cubic-bezier(0.16,1,0.3,1)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:900,fontFamily:"'Syne',sans-serif",color:"#00C896"}}>Connect WhatsApp Business</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#94A3B8",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16}}>×</button>
        </div>
        <div style={{fontSize:13,color:"#64748B",marginBottom:20,lineHeight:1.6}}>
          Enter your Meta WhatsApp Business API credentials from the{" "}
          <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" style={{color:"#00C896"}}>Meta Developer Console</a>.
        </div>
        {[
          { label:"Business / Display Name", value:businessName, set:setBusinessName, placeholder:"e.g. Acme Store", required:false },
          { label:"Phone Number ID", value:phoneNumberId, set:setPhoneNumberId, placeholder:"From WhatsApp > API Setup", required:true },
          { label:"Permanent Access Token", value:accessToken, set:setAccessToken, placeholder:"System user token or page access token", required:true, type:"password" },
        ].map(f => (
          <div key={f.label} style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#64748B",marginBottom:5,fontFamily:"'DM Mono',monospace"}}>{f.label}{f.required?" *":""}</div>
            <input
              type={f.type||"text"}
              value={f.value}
              onChange={e=>f.set(e.target.value)}
              placeholder={f.placeholder}
              style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 14px",color:"#E2E8F0",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box"}}
            />
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:6}}>
          <button onClick={onClose} style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#94A3B8",borderRadius:10,padding:"11px 0",fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{flex:2,background:saving?"rgba(0,200,150,0.4)":"#00C896",border:"none",color:"#04221A",borderRadius:10,padding:"11px 0",fontSize:14,fontWeight:700,cursor:saving?"wait":"pointer",fontFamily:"'Syne',sans-serif"}}>
            {saving ? "Verifying…" : "Connect WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUTOMATIONS PAGE
// ═══════════════════════════════════════════════════════════════
const TEMPLATES = [
  { id:"dm-reply",    icon:"💬", name:"Auto-Reply DMs",          desc:"Instantly reply to every new DM with an AI-crafted response.",          cat:"Engagement", platforms:["instagram","whatsapp","twitter"], color:C.rose },
  { id:"lead-cap",   icon:"🎯", name:"Lead Capture",             desc:"Save every new enquiry as a contact and trigger a follow-up sequence.", cat:"Sales",       platforms:["instagram","facebook","linkedin"], color:C.green },
  { id:"scheduler",  icon:"📅", name:"Content Scheduler",        desc:"Auto-publish posts at peak engagement times across all platforms.",     cat:"Content",     platforms:["instagram","twitter","facebook","linkedin","tiktok"], color:C.sky },
  { id:"email-seq",  icon:"📨", name:"Email Sequence",           desc:"Send a series of personalized emails to new subscribers automatically.",cat:"Marketing",   platforms:["gmail","outlook"], color:C.violet },
  { id:"followup",   icon:"🔄", name:"Follow-Up Reminder",       desc:"Automatically follow up with anyone who hasn't replied in 48 hours.",   cat:"Sales",       platforms:["gmail","whatsapp","instagram"], color:C.amber },
  { id:"comment-mod",icon:"🛡", name:"Comment Moderation",       desc:"Delete spam, reply to questions, and flag sales opportunities.",        cat:"Engagement",  platforms:["instagram","facebook","tiktok"], color:C.green },
  { id:"welcome",    icon:"👋", name:"New Follower Welcome",      desc:"Send a warm welcome message to every new follower within seconds.",     cat:"Engagement",  platforms:["instagram","twitter","telegram"], color:C.sky },
  { id:"invoice",    icon:"💰", name:"Payment Follow-Up",         desc:"Send automatic payment reminders and invoice notifications.",          cat:"Finance",     platforms:["gmail","whatsapp"], color:C.amber },
  { id:"report",     icon:"📊", name:"Weekly Report",            desc:"Auto-compile and email your performance summary every Monday morning.", cat:"Analytics",   platforms:["gmail","slack"], color:C.violet },
  { id:"order",      icon:"📦", name:"Order Confirmation",        desc:"Auto-send order details and tracking info via WhatsApp instantly.",    cat:"E-commerce",  platforms:["whatsapp","gmail"], color:C.rose },
  { id:"story-reply",icon:"⭕", name:"Story Reply Bot",           desc:"Engage every person who replies to your Instagram or WhatsApp Stories.",cat:"Engagement",  platforms:["instagram","whatsapp"], color:C.green },
  { id:"competitor", icon:"👁", name:"Mention Monitor",          desc:"Get instantly notified whenever your brand or competitors are mentioned.",cat:"Intelligence",platforms:["twitter","facebook"], color:C.sky },
];

const CATS = ["All","Sales","Engagement","Content","Marketing","Finance","E-commerce","Analytics","Intelligence"];

function useAutoFlowAPI(path, opts = {}) {
  const tok = localStorage.getItem("autoflowng_token") || "";
  return { headers: { "Content-Type":"application/json", "Authorization":`Bearer ${tok}` }, ...opts };
}

function AutomationsPage({ isMobile, connected, onConnect, toast }) {
  const [activeMap, setActiveMap] = useState({});
  const [runCounts, setRunCounts] = useState({});
  const [lastRun, setLastRun] = useState({});
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState(null);
  const [running, setRunning] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runResultTemplate, setRunResultTemplate] = useState("");

  useEffect(() => {
    const tok = localStorage.getItem("autoflowng_token") || "";
    if (!tok) { setLoaded(true); return; }
    fetch(`${API_BASE}/api/automations`, { headers: { "Authorization":`Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : { automations: [] })
      .then(d => {
        const m = {}, rc = {}, lr = {};
        (d.automations || []).forEach(a => {
          m[a.template_id] = a.enabled;
          rc[a.template_id] = a.run_count || 0;
          lr[a.template_id] = a.last_run_at;
        });
        setActiveMap(m);
        setRunCounts(rc);
        setLastRun(lr);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const activeCount = Object.values(activeMap).filter(Boolean).length;

  async function toggle(id) {
    const t = TEMPLATES.find(x => x.id === id);
    const newVal = !activeMap[id];
    setActiveMap(m => ({ ...m, [id]: newVal }));
    setToggling(id);
    try {
      const tok = localStorage.getItem("autoflowng_token") || "";
      const res = await fetch(`${API_BASE}/api/automations/toggle`, {
        method:"POST",
        headers: { "Content-Type":"application/json", "Authorization":`Bearer ${tok}` },
        body: JSON.stringify({ templateId: id, name: t.name, enabled: newVal }),
      });
      if (res.ok) {
        const data = await res.json();
        setRunCounts(rc => ({ ...rc, [id]: data.automation?.run_count || rc[id] || 0 }));
        if (newVal) {
          toast(`"${t.name}" activated! ⚡`);
        } else {
          toast(`"${t.name}" paused.`);
        }
      } else {
        setActiveMap(m => ({ ...m, [id]: !newVal }));
        toast("Failed to update automation. Try again.");
      }
    } catch {
      setActiveMap(m => ({ ...m, [id]: !newVal }));
      toast("Connection error. Check your internet.");
    }
    setToggling(null);
  }

  async function runNow(id) {
    const t = TEMPLATES.find(x => x.id === id);
    if (!activeMap[id]) { toast("Enable this automation first — toggle it on."); return; }
    setRunning(id);
    try {
      const tok = localStorage.getItem("autoflowng_token") || "";
      const res = await fetch(`${API_BASE}/api/automations/${id}/run`, {
        method:"POST",
        headers: { "Authorization":`Bearer ${tok}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRunCounts(rc => ({ ...rc, [id]: (rc[id] || 0) + 1 }));
        setLastRun(lr => ({ ...lr, [id]: new Date().toISOString() }));
        setRunResult(data);
        setRunResultTemplate(t.name);
        toast(`"${t.name}" executed! See results ⚡`);
      } else {
        toast(data.error || "Could not trigger automation.");
      }
    } catch { toast("Connection error. Check your internet."); }
    setRunning(null);
  }

  function formatLastRun(ts) {
    if (!ts) return null;
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const filtered = TEMPLATES.filter(t =>
    (filter === "All" || t.cat === filter) &&
    (search === "" || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {activeCount > 0 && (
        <div style={{ background:`linear-gradient(135deg,rgba(0,200,150,0.07),rgba(14,165,233,0.04))`, border:`1px solid rgba(0,200,150,0.2)`, borderRadius:14, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:C.green, display:"inline-block", animation:"glw 2s ease infinite" }}/>
            <span style={{ fontWeight:700, fontSize:15 }}><strong style={{ color:C.green }}>{activeCount}</strong> automation{activeCount>1?"s":""} active — saved to your account</span>
          </div>
          <Chip color={C.green} dot>Live</Chip>
        </div>
      )}

      {!loaded && (
        <div style={{ textAlign:"center", padding:"20px", color:C.sub, fontSize:15 }}>Loading your automations…</div>
      )}

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search automations..." style={{ flex:1, minWidth:160, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.ink, fontSize:15, fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {CATS.slice(0, isMobile ? 4 : CATS.length).map(c => (
            <button key={c} onClick={()=>setFilter(c)} style={{ background:filter===c?C.green:"transparent", color:filter===c?"#000":C.sub, border:`1px solid ${filter===c?C.green:C.border}`, borderRadius:20, padding:"6px 14px", fontSize:15, fontWeight:700, fontFamily:"'DM Mono',monospace", cursor:"pointer", transition:"all 0.15s" }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(300px,1fr))", gap:13 }}>
        {filtered.map(t => {
          const isOn = !!activeMap[t.id];
          const isToggling = toggling === t.id;
          const isRunning = running === t.id;
          const rc = runCounts[t.id] || 0;
          const lr = formatLastRun(lastRun[t.id]);
          return (
            <div key={t.id} style={{ background:C.s1, border:`1px solid ${isOn ? t.color+"50" : C.border}`, borderRadius:16, padding:"20px 22px", transition:"all 0.22s", boxShadow:isOn?`0 6px 28px ${t.color}12`:"none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:t.color+"15", border:`1px solid ${t.color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{t.icon}</div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", lineHeight:1.3, marginBottom:4 }}>{t.name}</div>
                    <Chip color={t.color}>{t.cat}</Chip>
                  </div>
                </div>
                <div
                  onClick={()=>!isToggling&&toggle(t.id)}
                  title={isOn?"Click to pause":"Click to activate"}
                  style={{ width:46, height:26, borderRadius:13, background:isToggling?"rgba(255,255,255,0.15)":isOn?t.color:"rgba(255,255,255,0.1)", position:"relative", cursor:isToggling?"wait":"pointer", transition:"background 0.2s", flexShrink:0, boxShadow:isOn&&!isToggling?`0 0 12px ${t.color}60`:"none", opacity:isToggling?0.6:1 }}
                >
                  <div style={{ position:"absolute", top:3, left:isOn?23:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}/>
                </div>
              </div>
              <p style={{ fontSize:15, color:C.sub, lineHeight:1.65, marginBottom:12 }}>{t.desc}</p>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:6 }}>
                <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                  {t.platforms.slice(0,5).map(pid => (
                    <div key={pid} title={PLATFORMS.find(p=>p.id===pid)?.name}>
                      <PlatformTile id={pid} size={26}/>
                    </div>
                  ))}
                  {t.platforms.length > 5 && <span style={{ fontSize:15, color:C.ghost, marginLeft:2 }}>+{t.platforms.length-5}</span>}
                </div>
                {rc > 0 && (
                  <span style={{ fontSize:11, color:C.sub, fontFamily:"'DM Mono',monospace", background:"rgba(255,255,255,0.04)", padding:"3px 8px", borderRadius:6, border:`1px solid ${C.border}` }}>
                    {rc.toLocaleString()} run{rc!==1?"s":""}{lr?` · ${lr}`:""}
                  </span>
                )}
              </div>
              {isOn && (
                <button
                  onClick={()=>!isRunning&&runNow(t.id)}
                  disabled={isRunning}
                  style={{ width:"100%", background:"transparent", border:`1px solid ${t.color}40`, color:t.color, borderRadius:9, padding:"8px 0", fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:isRunning?"wait":"pointer", transition:"all 0.15s", opacity:isRunning?0.6:1 }}
                  onMouseEnter={e=>{ if(!isRunning){e.currentTarget.style.background=`${t.color}12`;} }}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  {isRunning ? "Running…" : "▶ Run Now"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {runResult && (
      <RunResultsModal
        result={runResult}
        templateName={runResultTemplate}
        onClose={() => setRunResult(null)}
      />
    )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI AGENT PAGE
// ═══════════════════════════════════════════════════════════════
function AgentPage({ isMobile, connected, onConnect }) {
  const [messages, setMessages] = useState([
    { role:"assistant", text:"Hello! 👋 I'm your AutoFlow AI Agent. I can carry out tasks across all your connected platforms — replying to messages, scheduling posts, sending emails, capturing leads, and more.\n\nDescribe what you want me to do in plain English and I'll handle it." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const endRef = useRef(null);

  // Load persistent chat history + persisted tasks from DB on mount
  useEffect(() => {
    const tok = localStorage.getItem("autoflowng_token") || "";
    if (!tok) { setHistoryLoading(false); return; }
    // Load chat history
    fetch(`${API_BASE}/api/chat/history?session=agent&limit=40`, {
      headers: { "Authorization":`Bearer ${tok}` }
    })
    .then(r => r.ok ? r.json() : { messages:[] })
    .then(d => {
      if (d.messages && d.messages.length > 0) {
        setMessages(prev => [
          prev[0],
          ...d.messages.map(m => ({ role:m.role, text:m.content })),
        ]);
      }
    })
    .catch(() => {})
    .finally(() => setHistoryLoading(false));
    // Load persisted task queue
    fetch(`${API_BASE}/api/agent/tasks`, { headers: { "Authorization":`Bearer ${tok}` } })
      .then(r => r.ok ? r.json() : { tasks: [] })
      .then(d => {
        if (d.tasks?.length) {
          setTasks(d.tasks.map(t => ({
            id: t.id,
            name: t.name,
            platform: t.platform || "agent",
            status: t.status || "queued",
            done: 0,
            total: t.total || 0,
            time: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "–",
          })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  // Build context-aware suggestions based on connected platforms
  const connectedIds = (connected || []).map(c => c.id);
  const ALL_SUGGESTIONS = [
    { icon:"💬", text:"Reply to all unread messages across my connected platforms professionally", platforms:["whatsapp","instagram","slack","telegram"] },
    { icon:"📅", text:"Schedule 5 social media posts for this week at peak engagement times", platforms:["instagram","twitter","linkedin","facebook","tiktok"] },
    { icon:"💰", text:"Send payment reminders to all clients with outstanding invoices", platforms:["gmail","outlook"] },
    { icon:"📧", text:"Follow up on all emails that haven't gotten a reply in 48 hours", platforms:["gmail","outlook"] },
    { icon:"🎯", text:"Capture leads from my DMs and organize them into a contact list", platforms:["instagram","twitter","linkedin"] },
    { icon:"📊", text:"Generate a performance summary report for my last 7 days of activity", platforms:[] },
    { icon:"🤝", text:"Send a personalized welcome message to all new followers this week", platforms:["instagram","twitter","linkedin"] },
    { icon:"📝", text:"Draft and queue 3 LinkedIn posts showcasing my recent work", platforms:["linkedin"] },
  ];
  const SUGGESTIONS = ALL_SUGGESTIONS
    .filter(s => s.platforms.length === 0 || s.platforms.some(p => connectedIds.includes(p)))
    .slice(0, 6)
    .concat(ALL_SUGGESTIONS.filter(s => s.platforms.length === 0))
    .slice(0, 6)
    .filter((s,i,a) => a.findIndex(x=>x.text===s.text)===i)
    .slice(0, 6);

  function copyMessage(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    const newMessages = [...messages, { role:"user", text:msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${localStorage.getItem("autoflowng_token")||""}` },
        body: JSON.stringify({
          messages: newMessages.map(m=>({role:m.role,content:m.text})),
        }),
      });
      const data = await res.json();
      if (data.error) {
        const isRateLimit = res.status === 429;
        const errMsg = isRateLimit
          ? "⏱ You're sending messages too fast. Please wait a moment before trying again."
          : `⚠️ ${data.error}`;
        setMessages(m => [...m, { role:"assistant", text:errMsg, isError:true }]);
        setLoading(false);
        return;
      }
      const reply = data.content?.map(c=>c.text||"").join("") || "Got it! I've noted your request. 👍";
      setMessages(m => [...m, { role:"assistant", text:reply }]);
      // Build a task record — honest status "queued" (AI plans, not executes)
      const platforms = (connected || []).map(c=>c.id);
      const detectedPlatform = platforms.find(p => msg.toLowerCase().includes(p)) || platforms[0] || "agent";
      const total = Math.floor(Math.random()*12)+3;
      const newTask = {
        id: Date.now(),
        name: msg.slice(0,45)+(msg.length>45?"…":""),
        platform: detectedPlatform,
        status: "queued",
        done: 0,
        total,
        time: "Just now",
      };
      setTasks(t => [newTask, ...t.slice(0,9)]);
      // Persist task to DB so it survives refresh
      const tok2 = localStorage.getItem("autoflowng_token") || "";
      if (tok2) {
        fetch(`${API_BASE}/api/agent/tasks`, {
          method:"POST",
          headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${tok2}` },
          body: JSON.stringify({ name: newTask.name, platform: detectedPlatform, total }),
        }).catch(() => {});
      }
    } catch {
      setMessages(m => [...m, { role:"assistant", text:"⚠️ Connection issue — please check your internet and try again.", isError:true }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:isMobile?"column":"row", gap:16, height:isMobile?"auto":"calc(100vh - 130px)" }}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.s1, border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden", minHeight:isMobile?400:0 }}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${C.green},${C.sky})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🤖</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>AutoFlow AI Agent</div>
            <div style={{ fontSize:15, color:C.green, display:"flex", alignItems:"center", gap:5 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block", animation:"glw 2s ease infinite" }}/>Online — ready to work</div>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
          {historyLoading && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"18px 0", color:C.sub, fontSize:13 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:C.sub, animation:"glw 1s ease 0s infinite" }}/>
              <div style={{ width:6, height:6, borderRadius:"50%", background:C.sub, animation:"glw 1s ease 0.2s infinite" }}/>
              <div style={{ width:6, height:6, borderRadius:"50%", background:C.sub, animation:"glw 1s ease 0.4s infinite" }}/>
              <span>Loading conversation history…</span>
            </div>
          )}
          {messages.map((m,i) => (
            <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:"slideDown 0.2s ease" }}>
              <div style={{ maxWidth:"84%", background:m.isError?"rgba(251,113,133,0.08)":m.role==="user"?"rgba(0,200,150,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${m.isError?"rgba(251,113,133,0.3)":m.role==="user"?"rgba(0,200,150,0.25)":C.border}`, borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"11px 15px", fontSize:15, lineHeight:1.65, color:m.isError?C.rose:m.role==="user"?C.green:C.ink }}>
                {m.role==="user" ? m.text : renderMarkdown(m.text)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex", gap:5, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:"16px 16px 16px 4px", width:"fit-content" }}>
              {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:"50%", background:C.green, animation:`glw 1.2s ease ${i*0.2}s infinite` }}/>)}
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {messages.length <= 1 && !historyLoading && (
          <div style={{ padding:"0 16px 12px", borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
            {connectedIds.length === 0 && (
              <div style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:10, fontSize:13, color:C.amber, lineHeight:1.6 }}>
                💡 Connect a platform first to unlock targeted automation commands.
              </div>
            )}
            <div style={{ fontSize:11, color:C.sub, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Quick commands</div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)", gap:5 }}>
              {SUGGESTIONS.map(s => (
                <button key={s.text} onClick={()=>send(s.text)} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 12px", color:C.sub, fontSize:13, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", textAlign:"left", transition:"all 0.15s", display:"flex", alignItems:"flex-start", gap:8, lineHeight:1.4 }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.green+"40"; e.currentTarget.style.color=C.ink; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}
                ><span style={{flexShrink:0}}>{s.icon}</span>{s.text}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"flex-end", flexShrink:0 }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }}} placeholder="Describe a task for your AI agent..." rows={2} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.ink, fontSize:15, fontFamily:"'DM Sans',sans-serif", resize:"none", outline:"none", lineHeight:1.5 }}
            onFocus={e=>e.target.style.borderColor=C.green+"50"}
            onBlur={e=>e.target.style.borderColor=C.border}
          />
          <button onClick={()=>send()} disabled={!input.trim()||loading} style={{ width:40, height:40, borderRadius:10, background:input.trim()?C.green:"rgba(255,255,255,0.06)", border:"none", color:input.trim()?"#000":C.sub, fontSize:17, cursor:input.trim()?"pointer":"default", flexShrink:0, transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center" }}>↑</button>
        </div>
      </div>

      <div style={{ width:isMobile?"100%":280, display:"flex", flexDirection:"column", gap:12, flexShrink:0 }}>
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>Active Tasks</div>
          {tasks.map(task => {
            const pl = PLATFORMS.find(p=>p.id===task.platform);
            const pct = task.total > 0 ? Math.round((task.done/task.total)*100) : 0;
            const stCol = task.status==="done"?C.green:task.status==="running"?C.sky:C.amber;
            return (
              <div key={task.id} style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
                  <PlatformTile id={task.platform} size={28}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{task.name}</div>
                    <div style={{ fontSize:15, color:C.sub }}>{task.time}</div>
                  </div>
                  <Chip color={stCol}>{task.status}</Chip>
                </div>
                <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:stCol, borderRadius:3, transition:"width 0.6s ease" }}/>
                </div>
                <div style={{ fontSize:15, color:C.sub, marginTop:4 }}>{task.done}/{task.total} completed</div>
              </div>
            );
          })}
        </div>

        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:18, padding:"16px 18px", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>This Session</div>
          {[
            { label:"Tasks Queued",    value:String(tasks.length),                                       color:C.green },
            { label:"Completed",       value:String(tasks.filter(t=>t.status==="done").length),           color:C.sky },
            { label:"Running",         value:String(tasks.filter(t=>t.status==="running").length),        color:C.amber },
            { label:"Actions Est.",    value:String(tasks.reduce((a,t)=>a+t.total,0)),                    color:C.violet },
          ].map(s=>(
            <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:14, color:C.sub }}>{s.label}</span>
              <span style={{ fontSize:16, fontWeight:900, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.value}</span>
            </div>
          ))}
          {tasks.length === 0 && (
            <div style={{ fontSize:13, color:C.sub, textAlign:"center", padding:"12px 0" }}>
              Send a command to see tasks here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS PAGE
// ═══════════════════════════════════════════════════════════════
function AnalyticsPage({ isMobile, connected, onConnect }) {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tok = localStorage.getItem("autoflowng_token") || "";
    setLoading(true);
    fetch(`${API_BASE}/api/analytics?range=${range}`, {
      headers: { "Authorization":`Bearer ${tok}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const WEEKLY = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const ACTIONS = data?.daily || [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...ACTIONS, 1);

  const PLATFORM_STATS_RAW = [
    { id:"instagram", name:"Instagram", color:"#E1306C", actions: data?.byPlatform?.instagram || 0 },
    { id:"whatsapp",  name:"WhatsApp",  color:"#25D366", actions: data?.byPlatform?.whatsapp  || 0 },
    { id:"gmail",     name:"Gmail",     color:"#EA4335", actions: data?.byPlatform?.gmail     || 0 },
    { id:"twitter",   name:"Twitter/X", color:"#1DA1F2", actions: data?.byPlatform?.twitter   || 0 },
    { id:"linkedin",  name:"LinkedIn",  color:"#0A66C2", actions: data?.byPlatform?.linkedin  || 0 },
  ];
  const platMax = Math.max(...PLATFORM_STATS_RAW.map(p=>p.actions), 1);
  const PLATFORM_STATS = PLATFORM_STATS_RAW.map(p => ({ ...p, pct: Math.round((p.actions / platMax) * 100) }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:15, color:C.sub }}>Your automation performance at a glance</div>
        <div style={{ display:"flex", gap:6 }}>
          {["7d","30d","90d"].map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{ background:range===r?C.green:"transparent", color:range===r?"#000":C.sub, border:`1px solid ${range===r?C.green:C.border}`, borderRadius:8, padding:"6px 14px", fontSize:15, fontWeight:700, fontFamily:"'DM Mono',monospace", cursor:"pointer", transition:"all 0.15s" }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Actions Executed", value: loading?"…":(data?.totalActions||0).toLocaleString(), color:C.green },
          { label:"Messages Sent",    value: loading?"…":(data?.messagesSent||0).toLocaleString(),  color:C.sky },
          { label:"Leads Captured",   value: loading?"…":(data?.leadsCaptures||0).toLocaleString(), color:C.amber },
          { label:"Avg Response Time",value: loading?"…":(data?.avgResponse||"—"),                  color:C.violet },
        ].map(k=>(
          <div key={k.label} style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:isMobile?"14px":"18px 20px" }}>
            <div style={{ fontSize:10, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>{k.label}</div>
            <div style={{ fontSize:isMobile?22:28, fontWeight:900, color:k.color, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em", lineHeight:1, marginBottom:6 }}>{k.value}</div>
            <div style={{ fontSize:12, color:C.sub }}>{range} period</div>
          </div>
        ))}
      </div>

      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?"16px":"22px 24px" }}>
        <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:4 }}>Daily Actions</div>
        <div style={{ fontSize:15, color:C.sub, marginBottom:20 }}>Number of automated actions executed per day</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:isMobile?8:14, height:140 }}>
          {WEEKLY.map((day,i)=>(
            <div key={day} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ fontSize:15, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{ACTIONS[i].toLocaleString()}</div>
              <div style={{ width:"100%", borderRadius:"6px 6px 0 0", background:`linear-gradient(180deg,${C.green},${C.sky})`, height:`${Math.round((ACTIONS[i]/max)*100)}px`, minHeight:8, transition:"height 0.6s ease" }}/>
              <div style={{ fontSize:15, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{day}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)", gap:14 }}>
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?"16px":"20px 22px" }}>
          <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:18 }}>Platform Activity</div>
          {PLATFORM_STATS.map(p=>(
            <div key={p.id} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <PlatformTile id={p.id} size={28}/>
                  <span style={{ fontSize:15, fontWeight:700 }}>{p.name}</span>
                </div>
                <span style={{ fontSize:15, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{p.actions.toLocaleString()} actions</span>
              </div>
              <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${p.pct}%`, background:p.color, borderRadius:3, transition:"width 0.8s ease" }}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?"16px":"20px 22px" }}>
          <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:18 }}>Top Performing Automations</div>
          {(!data?.topAutomations || data.topAutomations.length === 0) ? (
            <div style={{ textAlign:"center", padding:"32px 16px", color:C.sub }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🤖</div>
              <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:6 }}>No automations running yet</div>
              <div style={{ fontSize:13, lineHeight:1.7 }}>Activate automations and run them to see performance data here.</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {data.topAutomations.map((a, i) => {
                const tmpl = TEMPLATES.find(t=>t.id===a.template_id) || {};
                return (
                  <div key={a.template_id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"rgba(255,255,255,0.02)", borderRadius:10, border:`1px solid ${C.border}` }}>
                    <div style={{ fontWeight:900, fontFamily:"'Syne',sans-serif", color:C.sub, fontSize:16, width:20, textAlign:"center" }}>{i+1}</div>
                    <div style={{ fontSize:18, flexShrink:0 }}>{tmpl.icon || "⚡"}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.name}</div>
                      <div style={{ fontSize:12, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{(a.run_count||0).toLocaleString()} runs</div>
                    </div>
                    {tmpl.color && <Chip color={tmpl.color}>{tmpl.cat||"Auto"}</Chip>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ background:`linear-gradient(135deg,rgba(0,200,150,0.07),rgba(56,189,248,0.04))`, border:`1px solid rgba(0,200,150,0.2)`, borderRadius:16, padding:isMobile?"18px":"22px 28px", display:"flex", flexDirection:isMobile?"column":"row", justifyContent:"space-between", alignItems:isMobile?"flex-start":"center", gap:16 }}>
        <div>
          <div style={{ fontSize:isMobile?20:24, fontWeight:900, fontFamily:"'Syne',sans-serif", marginBottom:6 }}>
            ⏱ {loading?"…":(data?.hoursSaved||0)} hours saved this {range==="7d"?"week":range==="30d"?"month":"quarter"}
          </div>
          <div style={{ fontSize:15, color:C.sub, maxWidth:420 }}>
            {(data?.totalActions||0) > 0
              ? `AutoFlowNG has executed ${(data.totalActions||0).toLocaleString()} automated actions in the last ${range}, saving you real time and money.`
              : "Activate automations and AutoFlowNG will track all actions here. Your time savings will appear once automations start running."
            }
          </div>
        </div>
        <div style={{ textAlign:isMobile?"left":"right", flexShrink:0 }}>
          <div style={{ fontSize:15, color:C.sub, marginBottom:4, fontFamily:"'DM Mono',monospace" }}>EQUIVALENT VALUE</div>
          <div style={{ fontSize:34, fontWeight:900, color:C.green, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.03em" }}>
            ₦{loading?"…":((data?.hoursSaved||0) * 2000).toLocaleString("en-NG")}
          </div>
          <div style={{ fontSize:15, color:C.sub }}>in saved labour costs</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BILLING PAGE
// ═══════════════════════════════════════════════════════════════
function BillingPage({ isMobile, onUpgrade, trial }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [payingPlan, setPayingPlan] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const isSubscribed = trial?.subscribed ?? false;
  const currentPlan = isSubscribed ? "Business" : "Free Trial";
  const nextBilling = isSubscribed ? "Next month" : "—";
  const usedActions = 0;
  const totalActions = 50000;
  const usedPct = Math.round((usedActions/totalActions)*100);
  const regionData = detectRegionData();
  const BILLING_PLANS = getRegionalPlans(regionData);

  useEffect(() => {
    const tok = localStorage.getItem("autoflowng_token") || "";
    if (!tok) return;
    // FIX: Use API_BASE instead of hardcoded URL
    fetch(`${API_BASE}/api/payments/history`, {
      headers: { "Authorization": `Bearer ${tok}` }
    })
    .then(r => r.ok ? r.json() : { payments: [] })
    .then(d => { if (d.payments) setPaymentHistory(d.payments); })
    .catch(() => {});
  }, []);

  function handleUpgrade(plan) {
    if (plan.name === currentPlan) return;
    setPayingPlan(plan);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {payingPlan && (
        <PayModal
          plan={payingPlan}
          onClose={() => setPayingPlan(null)}
          onSuccess={() => { setPayingPlan(null); if (onUpgrade) onUpgrade(payingPlan.name); }}
        />
      )}
      <div style={{ background:`linear-gradient(135deg,rgba(0,200,150,0.08),rgba(14,165,233,0.05))`, border:`1px solid rgba(0,200,150,0.22)`, borderRadius:18, padding:isMobile?"20px":"26px 28px" }}>
        <div style={{ display:"flex", flexDirection:isMobile?"column":"row", justifyContent:"space-between", alignItems:isMobile?"flex-start":"center", gap:16, marginBottom:22 }}>
          <div>
            <div style={{ fontSize:15, color:C.sub, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6, fontFamily:"'DM Mono',monospace" }}>Current Plan</div>
            <div style={{ fontSize:isMobile?24:28, fontWeight:900, fontFamily:"'Syne',sans-serif", marginBottom:4 }}>{currentPlan} Plan</div>
            <div style={{ fontSize:15, color:C.sub }}>Next billing: <strong style={{ color:C.ink }}>{nextBilling}</strong>{isSubscribed && <> · <strong style={{ color:C.green }}>{BILLING_PLANS[1]?.price || ""}</strong>/mo</>}</div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Chip color={C.green} dot>Active</Chip>
            <button onClick={()=>setShowUpgrade(!showUpgrade)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:9, padding:"8px 16px", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.hi; e.currentTarget.style.color=C.ink; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}
            >{showUpgrade?"Hide Plans":"Change Plan"}</button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
          {[
            { label:"Actions Used", value:`${usedActions.toLocaleString()} / ${totalActions.toLocaleString()}`, pct:usedPct, color:usedPct>80?C.rose:C.green },
            { label:"Platforms Connected", value:"0 / All", pct:0, color:C.sky },
            { label:"Team Members", value:"1 / 5", pct:20, color:C.violet },
          ].map(u=>(
            <div key={u.label} style={{ background:"rgba(0,0,0,0.2)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontSize:15, color:C.sub, marginBottom:6, fontFamily:"'DM Mono',monospace" }}>{u.label}</div>
              <div style={{ fontSize:15, fontWeight:800, marginBottom:8 }}>{u.value}</div>
              <div style={{ height:5, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${u.pct}%`, background:u.color, borderRadius:3 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showUpgrade && (
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:14, animation:"slideDown 0.3s ease" }}>
          {BILLING_PLANS.map(plan=>(
            <div key={plan.name} style={{ background:plan.name===currentPlan?`linear-gradient(135deg,${plan.color}10,transparent)`:C.s1, border:`1.5px solid ${plan.name===currentPlan?plan.color+"55":C.border}`, borderRadius:18, padding:"22px 20px", position:"relative", transition:"transform 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="none"}
            >
              {plan.name===currentPlan&&<div style={{ position:"absolute", top:14, right:14 }}><Chip color={plan.color}>Current</Chip></div>}
              <div style={{ fontSize:15, color:C.sub, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6, fontFamily:"'DM Mono',monospace" }}>{plan.name}</div>
              <div style={{ fontSize:34, fontWeight:900, color:plan.color, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.035em", marginBottom:16 }}>{plan.price}<span style={{ fontSize:15, color:C.sub, fontWeight:400 }}>/mo</span></div>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                {plan.features.map(f=><li key={f} style={{ display:"flex", gap:8, fontSize:15, color:"rgba(232,238,255,0.7)" }}><span style={{ color:plan.color }}>✓</span>{f}</li>)}
              </ul>
              <button onClick={()=>plan.name!==currentPlan&&handleUpgrade(plan)} style={{
                width:"100%",
                background: plan.name===currentPlan ? "transparent" : `linear-gradient(135deg,${plan.color},${plan.color}cc)`,
                color: plan.name===currentPlan ? plan.color : "#fff",
                border:`1.5px solid ${plan.color}`,
                borderRadius:10, padding:"12px 0", fontWeight:800, fontSize:15,
                fontFamily:"'Syne',sans-serif",
                cursor:plan.name===currentPlan?"default":"pointer",
                transition:"all 0.2s",
                boxShadow: plan.name!==currentPlan ? `0 4px 16px ${plan.color}30` : "none",
              }}
                onMouseEnter={e=>plan.name!==currentPlan&&(e.currentTarget.style.opacity="0.85")}
                onMouseLeave={e=>(e.currentTarget.style.opacity="1")}
              >{plan.name===currentPlan ? "✓ Current Plan" : `Switch to ${plan.name} →`}</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <div style={{ fontSize:24 }}>🔒</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Payments powered by {regionData.group === "africa" ? "Paystack" : "Stripe"}</div>
          <div style={{ fontSize:15, color:C.sub }}>{regionData.group === "africa" ? "Pay with your debit card, bank transfer, or USSD via Paystack — fully secure, no dollar card needed." : "Pay with Visa, Mastercard, or American Express via Stripe — fully secure."} Auto-renews monthly.</div>
        </div>
        <button style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:9, padding:"9px 16px", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>Update Payment</button>
      </div>

      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>Payment History</div>
        {paymentHistory.length === 0 ? (
          <div style={{textAlign:"center",padding:"40px 20px",color:C.sub}}>
            <div style={{fontSize:40,marginBottom:12}}>🧾</div>
            <div style={{fontSize:16,fontWeight:700,color:C.ink,marginBottom:8}}>No payments yet</div>
            <div style={{fontSize:15}}>Your payment history will appear here after your first subscription.</div>
          </div>
        ) : paymentHistory.map((h,i)=>(
          <div key={i} style={{ padding:isMobile?"13px 16px":"14px 22px", borderBottom:i<paymentHistory.length-1?`1px solid ${C.border}`:"none", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:isMobile?"wrap":"nowrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"rgba(0,200,150,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🧾</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700 }}>{h.plan} Plan — {h.amount}</div>
                <div style={{ fontSize:15, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{h.ref}</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <span style={{ fontSize:15, color:C.sub }}>{h.date}</span>
              <Chip color={C.green}>{h.status}</Chip>
              <button style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:7, padding:"5px 10px", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>PDF</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background:"rgba(251,113,133,0.04)", border:`1px solid rgba(251,113,133,0.15)`, borderRadius:14, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:C.rose, marginBottom:4 }}>Cancel Subscription</div>
          <div style={{ fontSize:15, color:C.sub }}>You can cancel anytime. Your account stays active until the end of your billing period.</div>
        </div>
        <button style={{ background:"transparent", border:`1px solid ${C.rose}40`, color:C.rose, borderRadius:9, padding:"9px 18px", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>Cancel Plan</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI KNOWLEDGE ASSISTANT PAGE
// ═══════════════════════════════════════════════════════════════

const LANGUAGES = [
  { code:"en",    label:"English",    flag:"🇬🇧", native:"English" },
  { code:"fr",    label:"French",     flag:"🇫🇷", native:"Français" },
  { code:"ar",    label:"Arabic",     flag:"🇸🇦", native:"العربية" },
  { code:"sw",    label:"Swahili",    flag:"🇰🇪", native:"Kiswahili" },
  { code:"ha",    label:"Hausa",      flag:"🇳🇬", native:"Hausa" },
  { code:"yo",    label:"Yoruba",     flag:"🇳🇬", native:"Yorùbá" },
  { code:"ig",    label:"Igbo",       flag:"🇳🇬", native:"Igbo" },
  { code:"pt",    label:"Portuguese", flag:"🇧🇷", native:"Português" },
  { code:"es",    label:"Spanish",    flag:"🇪🇸", native:"Español" },
  { code:"zh",    label:"Chinese",    flag:"🇨🇳", native:"中文" },
  { code:"hi",    label:"Hindi",      flag:"🇮🇳", native:"हिन्दी" },
  { code:"am",    label:"Amharic",    flag:"🇪🇹", native:"አማርኛ" },
  { code:"zu",    label:"Zulu",       flag:"🇿🇦", native:"isiZulu" },
  { code:"so",    label:"Somali",     flag:"🇸🇴", native:"Soomaali" },
  { code:"de",    label:"German",     flag:"🇩🇪", native:"Deutsch" },
  { code:"ru",    label:"Russian",    flag:"🇷🇺", native:"Русский" },
];

const KNOWLEDGE_TOPICS = [
  { id:"realestate",   icon:"🏠", label:"Real Estate",            color:"#38BDF8" },
  { id:"global_biz",   icon:"🌐", label:"Global Business",        color:"#00C896" },
  { id:"africa_biz",   icon:"🌍", label:"African Business",        color:"#FBBF24" },
  { id:"western_biz",  icon:"🌎", label:"Western Business",        color:"#A78BFA" },
  { id:"eastern_biz",  icon:"🌏", label:"Eastern & Asian Business",color:"#FB7185" },
  { id:"engineering",  icon:"⚙️", label:"Engineering",            color:"#A78BFA" },
  { id:"mathematics",  icon:"📐", label:"Mathematics",            color:"#FBBF24" },
  { id:"education",    icon:"📚", label:"School & Education",     color:"#FB7185" },
  { id:"finance",      icon:"💰", label:"Finance & Investment",   color:"#00C896" },
  { id:"tech",         icon:"💻", label:"Technology",             color:"#38BDF8" },
  { id:"marketing",    icon:"📣", label:"Marketing & Sales",      color:"#FB7185" },
  { id:"agriculture",  icon:"🌾", label:"Agriculture",            color:"#00C896" },
  { id:"health",       icon:"🏥", label:"Healthcare Business",    color:"#FB7185" },
  { id:"legal",        icon:"⚖️", label:"Legal & Compliance",     color:"#FBBF24" },
  { id:"property_search", icon:"🔍", label:"Search Properties",   color:"#38BDF8" },
];

function KnowledgePage({ isMobile }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState(() => {
    try {
      const detected = (navigator.language || navigator.languages?.[0] || "en").split("-")[0].toLowerCase();
      const supported = LANGUAGES.map(l => l.code);
      return supported.includes(detected) ? detected : "en";
    } catch { return "en"; }
  });
  const [activeTopic, setActiveTopic] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const endRef = useRef(null);

  // Set language-aware initial greeting
  const [messages, setMessages] = useState(() => {
    try {
      const detected = (navigator.language || navigator.languages?.[0] || "en").split("-")[0].toLowerCase();
      const supported = LANGUAGES.map(l => l.code);
      const detectedLang = supported.includes(detected) ? detected : "en";
      const langObj = LANGUAGES.find(l => l.code === detectedLang);
      const greeting = detectedLang === "en"
        ? "Hello! 👋 I'm your AutoFlow Knowledge Assistant. I can help with business, real estate, finance, engineering, education, and much more — in multiple languages.\n\nPick a topic on the left or ask me anything!"
        : `Hello! 👋 Language auto-detected: ${langObj?.label || detectedLang} (${langObj?.native || ""}). I'll respond in ${langObj?.label || "your language"}.\n\nPick a topic on the left or ask me anything!`;
      return [{ role:"assistant", text: greeting }];
    } catch {
      return [{ role:"assistant", text:"Hello! 👋 I'm your AutoFlow Knowledge Assistant. I can help with business, real estate, finance, engineering, education, and much more — in multiple languages.\n\nPick a topic on the left or ask me anything!" }];
    }
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const currentLang = LANGUAGES.find(l=>l.code===lang) || LANGUAGES[0];

  const QUICK_QUESTIONS = {
    realestate: ["How does property buying work in my country?", "What documents do I need to purchase real estate?", "How do I verify property ownership legally?", "What is a title deed and why does it matter?", "How do I find properties for sale in my city?"],
    global_biz: ["How do I register a company in my country?", "What taxes does a small business typically pay?", "How do I get a business loan or grant?", "How do I open a corporate bank account?", "What is the most profitable business to start with $5,000?"],
    africa_biz: ["How do I register a business in Ghana?", "What is M-Pesa and how does it work?", "How do I export goods to other African countries?", "What is AfCFTA and how can I benefit?", "Best cities for business in East Africa?"],
    western_biz: ["How do I register an LLC in the USA?", "How do I open a UK Limited company?", "What is GDPR and how does it affect businesses?", "How do I export products to Europe?", "How do I get a business bank account as a foreigner?"],
    eastern_biz: ["How do I import goods from China?", "What is the Canton Fair and how do I attend?", "How do I source products on Alibaba safely?", "Business opportunities in India for entrepreneurs?", "How do I set up a business in Dubai?"],
    engineering: ["How do I design a reinforced concrete beam?", "How do I size a solar power system for a home?", "Explain Kirchhoff's voltage law with example", "What is CBR test in road construction?", "How do I calculate pump head for water supply?"],
    mathematics: ["Solve 3x² + 5x - 2 = 0 step by step", "Differentiate y = x³ + 4x² - 7x + 2", "Find the sum of AP: 3, 7, 11... to 20 terms", "Explain integration by substitution with example", "Solve a system of simultaneous equations step by step"],
    education: ["Summarize organic chemistry for high school", "Explain Newton's laws of motion simply", "How do I write a good lesson plan?", "What are the most tested topics in physics exams?", "Explain photosynthesis for secondary school students"],
    finance: ["How do I start investing in stocks?", "What is the difference between bonds and treasury bills?", "How do I trade forex safely?", "How do savings apps like Acorns or PiggyVest work?", "How do I choose a pension or retirement fund?"],
    tech: ["How do I start learning programming for free?", "How do I set up an e-commerce store?", "Best digital marketing strategies for small businesses?", "How do I use AI tools to grow my business?", "How do I rank my website on Google?"],
    marketing: ["How do I market my business on WhatsApp?", "How do I run effective Facebook ads?", "Write me a sales pitch for my business", "How do I find my first customers?", "What is the best social media platform for B2B?"],
    agriculture: ["How do I start a fish farming business?", "How profitable is poultry farming?", "How do I process crops for export?", "What government agriculture loans are available?", "How do I sell farm produce at better prices?"],
    health: ["How do I start a pharmacy or clinic?", "What licenses do I need to open a healthcare facility?", "What are the opportunities in HealthTech?", "How do I get medical device regulatory approval?", "How does health insurance work for employees?"],
    legal: ["What do land ownership laws say in my country?", "How do I trademark my business name?", "How do I comply with data protection regulations?", "How do I write a legally binding business contract?", "What are the legal requirements to start a company?"],
    property_search: ["How do I search for property in my city?", "What is the best online platform to find real estate?", "How do I verify if a property listing is genuine?", "What are typical property prices per square meter globally?", "How do I negotiate a property purchase price?"],
  };

  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    const newMessages = [...messages, { role:"user", text:msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      // FIX: Use API_BASE instead of hardcoded URL
      const res = await fetch(`${API_BASE}/api/knowledge`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${localStorage.getItem("autoflowng_token")||""}` },
        body: JSON.stringify({
          lang: lang,
          messages: newMessages.map(m=>({ role:m.role, content:m.text })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(c=>c.text||"").join("") || "I'm here to help! Could you please rephrase your question?";
      setMessages(m => [...m, { role:"assistant", text:reply }]);
    } catch {
      setMessages(m => [...m, { role:"assistant", text:"I had a connection issue. Please try again! 💪" }]);
    }
    setLoading(false);
  }

  function changeLang(code) {
    setLang(code);
    setShowLangPicker(false);
    const selected = LANGUAGES.find(l=>l.code===code);
    setMessages([{ role:"assistant", text: code==="en"
      ? "Hello! 👋 Language set to English. How can I help you today?"
      : `Hello! 👋 Language set to ${selected.label} (${selected.native}). I will now respond in ${selected.label}. How can I help you?`
    }]);
  }

  function selectTopic(topicId) {
    setActiveTopic(activeTopic===topicId?null:topicId);
    const topic = KNOWLEDGE_TOPICS.find(t=>t.id===topicId);
    setMessages([{ role:"assistant", text:`${topic.icon} Topic selected: **${topic.label}**\n\nI'm ready to help! Pick a quick question below or ask me anything about this topic.\n\nI have detailed knowledge including prices, step-by-step guides, global business practices, and can assist anyone anywhere in the world — in your preferred language! 🚀` }]);
  }

  const currentQuestions = activeTopic ? (QUICK_QUESTIONS[activeTopic] || []) : [];
  const topicColor = activeTopic ? (KNOWLEDGE_TOPICS.find(t=>t.id===activeTopic)?.color || C.green) : "#A78BFA";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"10px 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span style={{ fontSize:15, color:C.sub, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>🌐 Language:</span>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, flex:1 }}>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={()=>changeLang(l.code)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${lang===l.code?l.code==="en"?C.green:"#A78BFA":C.border}`, background:lang===l.code?"rgba(167,139,250,0.15)":"transparent", color:lang===l.code?l.code==="en"?C.green:"#A78BFA":C.sub, fontSize:15, fontWeight:600, cursor:"pointer", transition:"all 0.15s", flexShrink:0 }}>
              <span>{l.flag}</span>
              <span>{l.native}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:isMobile?"column":"row", gap:12, height:isMobile?"auto":"calc(100vh - 220px)" }}>

        <div style={{ width:isMobile?"100%":200, flexShrink:0 }}>
          <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>📚 Topics</div>
            <div style={{ padding:"6px", maxHeight:isMobile?120:420, overflowY:"auto", display:"flex", flexDirection:isMobile?"row":"column", flexWrap:isMobile?"wrap":"nowrap", gap:3 }}>
              {KNOWLEDGE_TOPICS.map(t => (
                <button key={t.id} onClick={()=>selectTopic(t.id)} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 10px", borderRadius:9, border:`1px solid ${activeTopic===t.id?t.color+"60":C.border}`, background:activeTopic===t.id?`${t.color}15`:"transparent", color:activeTopic===t.id?t.color:C.sub, fontSize:15, fontWeight:600, cursor:"pointer", textAlign:"left", transition:"all 0.12s", width:isMobile?"auto":"100%", flexShrink:0 }}
                  onMouseEnter={e=>{ if(activeTopic!==t.id){ e.currentTarget.style.borderColor=t.color+"40"; e.currentTarget.style.color=C.ink; }}}
                  onMouseLeave={e=>{ if(activeTopic!==t.id){ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}}
                >
                  <span style={{fontSize:15}}>{t.icon}</span>
                  <span style={{flex:1, lineHeight:1.3}}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", minHeight:isMobile?420:0 }}>

          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,#A78BFA,#38BDF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>🧠</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>AutoFlow Knowledge Assistant</div>
              <div style={{ fontSize:15, color:topicColor, display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:topicColor, display:"inline-block", animation:"glw 2s ease infinite", flexShrink:0 }}/>
                <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{currentLang.flag} {currentLang.native} · Expert in Business, Real Estate, Education & More</span>
              </div>
            </div>
            <button onClick={()=>{ setMessages([{ role:"assistant", text:"Chat cleared! 👋 Ask me anything — I'm ready to help!" }]); setActiveTopic(null); }} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 10px", color:C.sub, fontSize:15, cursor:"pointer", flexShrink:0 }}>Clear</button>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"14px", display:"flex", flexDirection:"column", gap:10 }}>
            {messages.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", alignItems:"flex-start", gap:8, animation:"slideDown 0.2s ease" }}>
                {m.role==="assistant" && (
                  <div style={{ width:26, height:26, borderRadius:"50%", background:`linear-gradient(135deg,#A78BFA,#38BDF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0, marginTop:2 }}>🧠</div>
                )}
                <div style={{ maxWidth:"84%", background:m.role==="user"?"rgba(0,200,150,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${m.role==="user"?"rgba(0,200,150,0.25)":C.border}`, borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", padding:"10px 14px", fontSize:15, lineHeight:1.75, color:m.role==="user"?C.green:C.ink, whiteSpace:"pre-wrap" }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:`linear-gradient(135deg,#A78BFA,#38BDF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>🧠</div>
                <div style={{ display:"flex", gap:5, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:"14px 14px 14px 4px" }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#A78BFA", animation:`glw 1.2s ease ${i*0.2}s infinite` }}/>)}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {currentQuestions.length > 0 && messages.length <= 1 && (
            <div style={{ padding:"0 14px 10px", display:"flex", flexDirection:"column", gap:5, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
              <div style={{ fontSize:10, color:C.sub, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:2 }}>Quick questions</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:160, overflowY:"auto" }}>
                {currentQuestions.map(q => (
                  <button key={q} onClick={()=>send(q)} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.sub, fontSize:15, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=topicColor+"40"; e.currentTarget.style.color=C.ink; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}
                  >💬 {q}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8, alignItems:"flex-end", flexShrink:0 }}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }}} placeholder={`Ask anything in ${currentLang.native}...`} rows={2} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 12px", color:C.ink, fontSize:15, fontFamily:"'DM Sans',sans-serif", resize:"none", outline:"none", lineHeight:1.5 }}
              onFocus={e=>e.target.style.borderColor="#A78BFA50"}
              onBlur={e=>e.target.style.borderColor=C.border}
            />
            <button onClick={()=>send()} disabled={!input.trim()||loading} style={{ width:38, height:38, borderRadius:10, background:input.trim()?"#A78BFA":"rgba(255,255,255,0.06)", border:"none", color:input.trim()?"#000":C.sub, fontSize:16, cursor:input.trim()?"pointer":"default", flexShrink:0, transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center" }}>↑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ROOT
// ═══════════════════════════════════════════════════════════════
// FIX: Use environment variable for app URL, fallback to production domain
const APP_URL = import.meta.env.VITE_APP_URL || "https://autoflowng.com";
// FIX: Use API_BASE for all backend references — single source of truth
const BACKEND_URL = API_BASE;

function getToken() { return localStorage.getItem("autoflowng_token") || ""; }

function authHeaders(extra = {}) {
  return { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}`, ...extra };
}

function apiFetch(path, opts = {}) {
  return fetch(BACKEND_URL + path, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
}

function LoginModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { status: srvStatus, latency: srvLatency, watching: srvWatching, notifyWhenOnline, cancelNotify } = useServerStatus();

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password) { setError("Please fill in all fields."); return; }
    if (mode === "register" && !name.trim()) { setError("Please enter your name."); return; }
    setLoading(true);

    // Ping the server first as a connectivity check.
    // Railway never sleeps but this confirms the server is reachable
    // before attempting auth, giving better error messages if offline.
    try {
      await fetch(`${BACKEND_URL}/api/ping`, { signal: AbortSignal.timeout(5000) });
    } catch (_) {
      // Ping failed — server is cold-starting. Show a helpful message and wait
      // a moment before trying the real request; it may still succeed.
      setError("Server is waking up… please wait a moment.");
      await new Promise(r => setTimeout(r, 4000));
      setError("");
    }

    const attemptAuth = async (signal) => {
      const endpoint = mode === "register"
        ? `${BACKEND_URL}/api/auth/register`
        : `${BACKEND_URL}/api/auth/login`;
      const body = mode === "register"
        ? { name: name.trim(), email: email.trim().toLowerCase(), password }
        : { email: email.trim().toLowerCase(), password };

      if (mode === "register") {
        const now = Date.now();
        localStorage.setItem("autoflowng_trial", JSON.stringify({
          startedAt: now, expiresAt: now + 3 * 24 * 60 * 60 * 1000, subscribed: false,
        }));
      }

      return fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    };

    // FIX: Increased timeout from 15s to 35s to accommodate Render cold starts.
    // Also added one automatic retry after a short delay so a single slow
    // cold-start doesn't permanently block the user.
    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 35000);
      try {
        const res = await attemptAuth(ctrl.signal);
        clearTimeout(timer);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong. Please try again.");
          setLoading(false);
          return;
        }
        localStorage.setItem("autoflowng_user", JSON.stringify(data.user));
        if (data.token) localStorage.setItem("autoflowng_token", data.token);
        onSuccess(data.user);
        return;
      } catch (e) {
        clearTimeout(timer);
        if (!navigator.onLine) {
          setError("No internet connection. Please check your network.");
          setLoading(false);
          return;
        }
        if (attempt < MAX_ATTEMPTS) {
          // First attempt timed out — slow connection or server busy. Retry once.
          setError("Server is still waking up… retrying automatically.");
          await new Promise(r => setTimeout(r, 5000));
          setError("");
          continue;
        }
        // All attempts exhausted
        if (e.name === "AbortError" || e.name === "TimeoutError") {
          setError("Server took too long to respond. Please try again in a few seconds.");
        } else {
          setError("Could not connect. Please check your internet and try again.");
        }
        setLoading(false);
      }
    }
  };

  const inputStyle = {
    width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:10, padding:"12px 14px", color:"#E8EEFF", fontSize:15, outline:"none",
    boxSizing:"border-box", opacity: loading ? 0.6 : 1,
  };
  const labelStyle = { color:"rgba(232,238,255,0.6)", fontSize:14, marginBottom:6, display:"block" };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(4,6,15,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"20px"}}>
      <div style={{background:"#0C1120",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"36px 28px",maxWidth:420,width:"100%"}}>

        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:10}}>🚀</div>
          <h2 style={{color:"#E8EEFF",fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif",margin:"0 0 6px"}}>
            {mode==="register" ? "Start Free Trial" : "Welcome Back"}
          </h2>
          <p style={{color:"rgba(232,238,255,0.4)",fontSize:14,margin:"0 0 12px"}}>
            {mode==="register" ? "3 days free • No credit card needed" : "Sign in to your account"}
          </p>
          <div style={{display:"flex",justifyContent:"center"}}>
            <ServerStatusBadge status={srvStatus} latency={srvLatency} />
          </div>
          {(srvStatus === "waking" || srvStatus === "offline") && (
            <p style={{color:"#FBBF24",fontSize:12,marginTop:8,marginBottom:0,lineHeight:1.5}}>
              ⏳ Server starting up — you can still sign in, it may take a moment.
            </p>
          )}
          {srvWatching && srvStatus === "online" && (
            <div style={{marginTop:10,background:"rgba(0,200,150,0.1)",border:"1px solid rgba(0,200,150,0.3)",borderRadius:10,padding:"9px 14px",color:"#00C896",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:7}}>
              ✅ Server is back online — you can sign in now!
            </div>
          )}
        </div>

        {error && (
          <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"10px 14px",color:"#F87171",fontSize:14,marginBottom:16,textAlign:"center"}}>
            {error}
          </div>
        )}

        {mode==="register" && (
          <div style={{marginBottom:14}}>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name"
              disabled={loading} style={inputStyle} />
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Email Address</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email"
            disabled={loading} style={inputStyle} />
        </div>

        <div style={{marginBottom:24}}>
          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters"
            disabled={loading} style={inputStyle}
            onKeyDown={e=>{ if(e.key==="Enter" && !loading) handleSubmit(); }} />
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{
          width:"100%", background: loading ? "rgba(0,200,150,0.45)" : "#00C896",
          color:"#04060F", border:"none", borderRadius:12, padding:"14px",
          fontSize:16, fontWeight:800, cursor: loading ? "not-allowed" : "pointer",
          marginBottom:14, fontFamily:"'Syne',sans-serif", transition:"background 0.2s",
        }}>
          {loading ? "Signing in…" : mode==="register" ? "Create Free Account →" : "Sign In →"}
        </button>

        <div style={{textAlign:"center",marginBottom:12}}>
          <span style={{color:"rgba(232,238,255,0.4)",fontSize:14}}>
            {mode==="register" ? "Already have an account? " : "Don't have an account? "}
          </span>
          <span onClick={()=>{ if(!loading){ setMode(mode==="register"?"login":"register"); setError(""); }}}
            style={{color:"#00C896",fontSize:14,cursor:"pointer",fontWeight:600}}>
            {mode==="register" ? "Sign In" : "Sign Up Free"}
          </span>
        </div>

        <button onClick={()=>{ if(!loading) onClose(); }} disabled={loading} style={{
          width:"100%", background:"transparent", border:"1px solid rgba(255,255,255,0.08)",
          color:"rgba(232,238,255,0.35)", borderRadius:10, padding:"10px",
          fontSize:14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.4 : 1,
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD — Creator-only monitoring panel
// Access: add ?admin=1 to any URL, then enter your ADMIN_SECRET
// ═══════════════════════════════════════════════════════════════
const ADMIN_TABS = [
  { id:"overview",    icon:"◼",  label:"Overview"    },
  { id:"users",       icon:"👤", label:"Users"       },
  { id:"payments",    icon:"💰", label:"Payments"    },
  { id:"automations", icon:"⚡", label:"Automations" },
  { id:"system",      icon:"🔧", label:"System"      },
  { id:"ai",          icon:"🤖", label:"AI Command"  },
];

function AdminKPI({ label, value, sub, color, icon }) {
  return (
    <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ fontSize:10, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'DM Mono',monospace" }}>{label}</div>
        <span style={{ fontSize:18 }}>{icon}</span>
      </div>
      <div style={{ fontSize:28, fontWeight:900, fontFamily:"'Syne',sans-serif", color:color||C.ink, letterSpacing:"-0.025em", lineHeight:1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize:12, color:C.sub, marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function AdminTable({ columns, rows, emptyMsg="No data" }) {
  if (!rows?.length) return <div style={{ padding:"32px", textAlign:"center", color:C.sub, fontSize:14 }}>{emptyMsg}</div>;
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr>{columns.map(c=>(
            <th key={c.key} style={{ padding:"10px 14px", textAlign:"left", fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", color:C.sub, fontFamily:"'DM Mono',monospace", borderBottom:`1px solid ${C.border}`, fontWeight:600, whiteSpace:"nowrap" }}>{c.label}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={i} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)` }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.025)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            >
              {columns.map(c=>(
                <td key={c.key} style={{ padding:"10px 14px", color:c.col?c.col:C.ink, verticalAlign:"middle", whiteSpace:c.noWrap?"nowrap":"normal" }}>
                  {c.render ? c.render(row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminSpark({ data=[], color="#00C896", label="" }) {
  const max = Math.max(...data.map(d=>parseFloat(d.count||d.total||0)),1);
  return (
    <div>
      {label&&<div style={{ fontSize:10, color:C.sub, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>{label}</div>}
      <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:44 }}>
        {data.length===0
          ? [0,0,0,0,0,0,0].map((_,i)=><div key={i} style={{ flex:1, height:4, background:"rgba(255,255,255,0.06)", borderRadius:"2px 2px 0 0" }}/>)
          : data.map((d,i)=>{
            const h = Math.max(3,(parseFloat(d.count||d.total||0)/max)*44);
            return <div key={i} title={`${d.day}: ${d.count||d.total||0}`} style={{ flex:1, height:h, background:color, borderRadius:"2px 2px 0 0", opacity:0.5+0.5*(h/44) }}/>;
          })}
      </div>
      {data.length>0&&<div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
        <span style={{ fontSize:9, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{data[0]?.day}</span>
        <span style={{ fontSize:9, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{data[data.length-1]?.day}</span>
      </div>}
    </div>
  );
}

function SvcDot({ ok, label, detail }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:C.s1, border:`1px solid ${ok?"rgba(0,200,150,0.2)":"rgba(251,113,133,0.2)"}`, borderRadius:12 }}>
      <div style={{ width:10, height:10, borderRadius:"50%", background:ok?"#00C896":"#FB7185", flexShrink:0, animation:ok?"glw 2s ease infinite":"none" }}/>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>{label}</div>
        {detail&&<div style={{ fontSize:12, color:C.sub }}>{detail}</div>}
      </div>
      <div style={{ fontSize:12, color:ok?C.green:C.rose, fontWeight:700 }}>{ok?"✓ Active":"✗ Missing"}</div>
    </div>
  );
}

function AdminDashboard({ onExit }) {
  const [savedSecret]  = useState(()=>localStorage.getItem("afng_admin_s")||"");
  const [secretInput, setSecretInput] = useState("");
  const [secret, setSecret]           = useState("");
  const [authError, setAuthError]     = useState("");
  const [authed, setAuthed]           = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminNav, setAdminNav]       = useState("overview");
  const [overview, setOverview]       = useState(null);
  const [users, setUsers]             = useState([]);
  const [usersTotal, setUsersTotal]   = useState(0);
  const [userSearch, setUserSearch]   = useState("");
  const [payments, setPayments]       = useState([]);
  const [payStats, setPayStats]       = useState(null);
  const [automations, setAutomations] = useState([]);
  const [sysHealth, setSysHealth]     = useState(null);
  const [sysLoading, setSysLoading]   = useState(false);
  const [aiMsgs, setAiMsgs]          = useState([
    { role:"assistant", text:"👋 Hello, Creator. I'm your Admin AI with full knowledge of the AutoFlowNG platform.\n\nAsk me anything: analytics deep-dives, revenue simulations, growth projections, churn analysis, system diagnostics, or business strategy.\n\nWhat would you like to know?" }
  ]);
  const [aiInput, setAiInput]         = useState("");
  const [aiLoading, setAiLoading]     = useState(false);
  const aiEndRef                      = useRef(null);

  useEffect(()=>{ aiEndRef.current?.scrollIntoView({ behavior:"smooth" }); },[aiMsgs, aiLoading]);

  function af(url, opts={}) {
    return fetch(`${API_BASE}${url}`, {
      ...opts,
      headers:{ ...(opts.headers||{}), "x-admin-secret":secret||savedSecret, "Content-Type":"application/json" },
    });
  }

  async function tryAuth() {
    const s = secretInput.trim();
    if (!s) { setAuthError("Enter your ADMIN_SECRET"); return; }
    setAuthLoading(true); setAuthError("");
    try {
      const r = await fetch(`${API_BASE}/api/admin/overview`, { headers:{ "x-admin-secret":s } });
      if (r.status===403) { setAuthError("Wrong secret — check ADMIN_SECRET env var on your server"); setAuthLoading(false); return; }
      if (!r.ok) { setAuthError("Server error — is your backend running?"); setAuthLoading(false); return; }
      const data = await r.json();
      setSecret(s);
      localStorage.setItem("afng_admin_s", s);
      setOverview(data);
      setAuthed(true);
    } catch(e) { setAuthError("Connection failed: " + e.message); }
    setAuthLoading(false);
  }

  // Auto-try saved secret
  useEffect(()=>{
    if (!savedSecret) return;
    fetch(`${API_BASE}/api/admin/overview`,{ headers:{"x-admin-secret":savedSecret} })
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d){ setSecret(savedSecret); setOverview(d); setAuthed(true); } })
      .catch(()=>{});
  },[savedSecret]);

  async function loadTab(tab) {
    setAdminNav(tab);
    if (tab==="users" && users.length===0) {
      const r = await af(`/api/admin/users/all?limit=50`);
      if (r.ok){ const d=await r.json(); setUsers(d.users||[]); setUsersTotal(d.total||0); }
    }
    if (tab==="payments" && payments.length===0) {
      const r = await af("/api/admin/payments/all?limit=60");
      if (r.ok){ const d=await r.json(); setPayments(d.payments||[]); setPayStats(d.stats||null); }
    }
    if (tab==="automations" && automations.length===0) {
      const r = await af("/api/admin/automations/all");
      if (r.ok){ const d=await r.json(); setAutomations(d.automations||[]); }
    }
    if (tab==="system") {
      setSysLoading(true);
      const r = await af("/api/admin/system");
      if (r.ok) setSysHealth(await r.json());
      setSysLoading(false);
    }
    if (tab==="overview" && !overview) {
      const r = await af("/api/admin/overview");
      if (r.ok) setOverview(await r.json());
    }
  }

  async function searchUsers(q) {
    setUserSearch(q);
    const r = await af(`/api/admin/users/all?search=${encodeURIComponent(q)}&limit=50`);
    if (r.ok){ const d=await r.json(); setUsers(d.users||[]); setUsersTotal(d.total||0); }
  }

  async function sendAdminAI() {
    if (!aiInput.trim()||aiLoading) return;
    const msg = aiInput.trim();
    setAiInput("");
    const updated = [...aiMsgs, { role:"user", text:msg }];
    setAiMsgs(updated);
    setAiLoading(true);
    try {
      const r = await af("/api/admin/chat",{
        method:"POST",
        body: JSON.stringify({ messages: updated.map(m=>({ role:m.role, content:m.text })) }),
      });
      const d = await r.json();
      if (d.error) {
        setAiMsgs(m=>[...m,{ role:"assistant", text:`⚠️ ${d.error}`, isError:true }]);
      } else {
        setAiMsgs(m=>[...m,{ role:"assistant", text: d.content?.[0]?.text || "No response received." }]);
      }
    } catch {
      setAiMsgs(m=>[...m,{ role:"assistant", text:"⚠️ Connection error — please check the server is running and try again.", isError:true }]);
    }
    setAiLoading(false);
  }

  // ── Login screen ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif" }}>
        <GlobalStyles/>
        <div style={{ width:380, background:C.s1, border:`1px solid rgba(167,139,250,0.25)`, borderRadius:22, padding:"40px 36px", boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ fontSize:42, marginBottom:10 }}>🔐</div>
            <div style={{ fontSize:24, fontWeight:900, fontFamily:"'Syne',sans-serif", marginBottom:8 }}>AutoFlowNG Admin</div>
            <div style={{ fontSize:14, color:C.sub, lineHeight:1.6 }}>This panel is for the platform creator only.<br/>Enter your <code style={{ background:"rgba(255,255,255,0.06)", padding:"1px 6px", borderRadius:4, fontSize:12 }}>ADMIN_SECRET</code> env variable to proceed.</div>
          </div>
          <input type="password" value={secretInput} onChange={e=>setSecretInput(e.target.value)}
            placeholder="••••••••••••••••••••"
            onKeyDown={e=>{ if(e.key==="Enter") tryAuth(); }}
            style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${authError?C.rose:"rgba(167,139,250,0.3)"}`, borderRadius:10, padding:"13px 16px", color:C.ink, fontSize:16, fontFamily:"'DM Mono',monospace", marginBottom:authError?8:18, outline:"none", boxSizing:"border-box", letterSpacing:"0.1em" }}
          />
          {authError&&<div style={{ fontSize:13, color:C.rose, marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>⚠ {authError}</div>}
          <button onClick={tryAuth} disabled={authLoading} style={{ width:"100%", background:authLoading?"rgba(167,139,250,0.4)":"#A78BFA", color:"#fff", border:"none", borderRadius:11, padding:"14px", fontSize:16, fontWeight:800, fontFamily:"'Syne',sans-serif", cursor:authLoading?"default":"pointer", marginBottom:12, letterSpacing:"0.02em" }}>
            {authLoading ? "Verifying…" : "Enter Admin Panel →"}
          </button>
          <button onClick={onExit} style={{ width:"100%", background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:10, padding:"11px", fontSize:14, cursor:"pointer" }}>← Back to App</button>
        </div>
      </div>
    );
  }

  const o = overview;

  // ── Overview tab ──────────────────────────────────────────────
  function OverviewTab() {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <AdminKPI icon="👤" label="Total Users" value={(o?.users?.total||0).toLocaleString()} sub={`+${o?.users?.thisWeek||0} this week · +${o?.users?.thisMonth||0} this month`} color={C.sky}/>
          <AdminKPI icon="💰" label="MRR (30 days)" value={`₦${(o?.revenue?.mrr||0).toLocaleString()}`} sub={`${o?.revenue?.mrrTransactions||0} transactions`} color={C.green}/>
          <AdminKPI icon="⚡" label="Active Automations" value={(o?.automations?.active||0).toLocaleString()} sub={`${o?.automations?.todayEvents||0} events today`} color={C.amber}/>
          <AdminKPI icon="🏦" label="All-Time Revenue" value={`₦${(o?.revenue?.totalAmount||0).toLocaleString()}`} sub={`${o?.revenue?.totalTransactions||0} transactions total`} color={C.violet}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <AdminKPI icon="🎁" label="Trial Users" value={o?.users?.trial||0} sub={`${o?.users?.paid||0} paid subscribers`} color={C.amber}/>
          <AdminKPI icon="🔗" label="All-Time Events" value={(o?.automations?.totalEvents||0).toLocaleString()} color={C.sky}/>
          <AdminKPI icon="⏳" label="Pending Withdrawals" value={o?.pendingWithdrawals||0} color={o?.pendingWithdrawals>0?C.rose:C.green}/>
          <AdminKPI icon="📊" label="New Users (7d)" value={o?.users?.thisWeek||0} color={C.green}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
            <AdminSpark data={o?.users?.dailySignups||[]} color={C.sky} label="Signups — last 7 days"/>
          </div>
          <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
            <AdminSpark data={o?.revenue?.dailyRevenue||[]} color={C.green} label="Revenue — last 14 days"/>
          </div>
          <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
            <AdminSpark data={o?.automations?.dailyEvents||[]} color={C.amber} label="Events — last 7 days"/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:12 }}>
          <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>🆕 Recent Signups</div>
            <AdminTable
              columns={[
                { key:"name",       label:"Name"   },
                { key:"email",      label:"Email"  },
                { key:"plan",       label:"Plan",   render:r=><Chip color={r.plan==="trial"?C.amber:C.green}>{r.plan}</Chip> },
                { key:"created_at", label:"Joined", render:r=>new Date(r.created_at).toLocaleDateString(), noWrap:true },
              ]}
              rows={o?.users?.recent||[]}
              emptyMsg="No users yet"
            />
          </div>
          <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>🔗 Platform Connections</div>
            <div style={{ padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
              {(o?.connections?.byPlatform||[]).map(p=>(
                <div key={p.platform} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <PlatformTile id={p.platform} size={22}/>
                    <span style={{ textTransform:"capitalize", fontSize:14 }}>{p.platform}</span>
                  </div>
                  <span style={{ fontWeight:900, color:C.sky, fontFamily:"'DM Mono',monospace", fontSize:16 }}>{p.count}</span>
                </div>
              ))}
              {!o?.connections?.byPlatform?.length && <div style={{ fontSize:13, color:C.sub }}>No connections recorded yet</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Users tab ─────────────────────────────────────────────────
  function UsersTab() {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input value={userSearch} onChange={e=>searchUsers(e.target.value)} placeholder="Search by name or email…"
            style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 14px", color:C.ink, fontSize:13, outline:"none" }}/>
          <Chip color={C.sky}>{usersTotal} total</Chip>
          <button onClick={()=>searchUsers("")} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", color:C.sub, fontSize:13, cursor:"pointer" }}>Reset</button>
        </div>
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
          <AdminTable
            columns={[
              { key:"name",              label:"Name"        },
              { key:"email",             label:"Email"       },
              { key:"plan",              label:"Plan",        render:r=><Chip color={r.plan==="trial"?C.amber:C.green}>{r.plan}</Chip> },
              { key:"connection_count",  label:"Platforms",   noWrap:true, col:C.sky  },
              { key:"active_automations",label:"Automations", noWrap:true, col:C.green},
              { key:"payment_count",     label:"Payments",    noWrap:true, col:C.amber},
              { key:"total_paid",        label:"Spent",       render:r=>`₦${(parseFloat(r.total_paid)||0).toLocaleString()}`, noWrap:true },
              { key:"created_at",        label:"Joined",      render:r=>new Date(r.created_at).toLocaleDateString(), noWrap:true },
            ]}
            rows={users}
            emptyMsg="No users found"
          />
        </div>
      </div>
    );
  }

  // ── Payments tab ───────────────────────────────────────────────
  function PaymentsTab() {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {payStats && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            <AdminKPI icon="✅" label="Successful" value={payStats.successful||0} color={C.green}/>
            <AdminKPI icon="❌" label="Failed / Pending" value={payStats.failed||0} color={C.rose}/>
            <AdminKPI icon="💰" label="Total Collected" value={`₦${(parseFloat(payStats.total_revenue)||0).toLocaleString()}`} color={C.amber}/>
          </div>
        )}
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
          <AdminTable
            columns={[
              { key:"name",       label:"User"    },
              { key:"email",      label:"Email"   },
              { key:"amount",     label:"Amount",  render:r=>`₦${(parseFloat(r.amount)||0).toLocaleString()}`, noWrap:true },
              { key:"currency",   label:"Currency",noWrap:true },
              { key:"plan",       label:"Plan"    },
              { key:"status",     label:"Status",  render:r=><Chip color={r.status==="success"?C.green:r.status==="pending"?C.amber:C.rose}>{r.status}</Chip> },
              { key:"created_at", label:"Date",    render:r=>new Date(r.created_at).toLocaleString(), noWrap:true },
            ]}
            rows={payments}
            emptyMsg="No payments recorded yet"
          />
        </div>
      </div>
    );
  }

  // ── Automations tab ────────────────────────────────────────────
  function AutomationsTab() {
    return (
      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>All User Automations — sorted by run count</div>
        <AdminTable
          columns={[
            { key:"name",        label:"Automation"  },
            { key:"email",       label:"User"        },
            { key:"enabled",     label:"Status",      render:r=><Chip color={r.enabled?C.green:C.sub}>{r.enabled?"Active":"Off"}</Chip> },
            { key:"run_count",   label:"Runs",        noWrap:true, col:C.amber },
            { key:"event_count", label:"Events",      noWrap:true, col:C.sky   },
            { key:"last_run_at", label:"Last Run",    render:r=>r.last_run_at?new Date(r.last_run_at).toLocaleString():"Never", noWrap:true },
          ]}
          rows={automations}
          emptyMsg="No automations yet"
        />
      </div>
    );
  }

  // ── System tab ─────────────────────────────────────────────────
  function SystemTab() {
    if (sysLoading) return <div style={{ padding:"32px", color:C.sub, textAlign:"center" }}>⏳ Loading system diagnostics…</div>;
    const h = sysHealth;
    if (!h) return <div style={{ padding:"32px", color:C.sub, textAlign:"center" }}>Click System tab to run diagnostics</div>;
    const upH  = Math.floor((h.uptime||0)/3600);
    const upM  = Math.floor(((h.uptime||0)%3600)/60);
    const memMB = Math.round((h.memory?.rss||0)/1024/1024);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <AdminKPI icon="⏱" label="Uptime" value={upH > 0 ? `${upH}h ${upM}m` : `${upM}m`} color={C.green}/>
          <AdminKPI icon="🖥" label="Memory (RSS)" value={`${memMB} MB`} color={C.sky}/>
          <AdminKPI icon="📦" label="Node.js" value={h.nodeVersion} color={C.violet}/>
          <AdminKPI icon="🌍" label="Environment" value={h.environment} color={C.amber}/>
        </div>
        {h.dbStats && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
            {[["👤 Users",h.dbStats.users,C.sky],["🔗 Connections",h.dbStats.connections,C.green],["⚡ Events",h.dbStats.events,C.amber],["💰 Payments",h.dbStats.payments,C.violet],["💬 Chat Msgs",h.dbStats.chat_messages,C.rose]].map(([l,v,c])=>(
              <AdminKPI key={l} label={l} value={(parseInt(v)||0).toLocaleString()} color={c}/>
            ))}
          </div>
        )}
        <div style={{ fontSize:13, fontWeight:800, fontFamily:"'Syne',sans-serif", color:C.sub, textTransform:"uppercase", letterSpacing:"0.07em" }}>Service Status</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <SvcDot ok={h.database}    label="PostgreSQL Database"           detail={h.dbLatency?`${h.dbLatency}ms latency`:(h.dbError||"Unreachable")}/>
          <SvcDot ok={h.gemini}      label="Gemini AI"                     detail="GEMINI_API_KEY — AI Agent + Admin AI"/>
          <SvcDot ok={h.groq}        label="Groq AI"                       detail="GROQ_API_KEY — Knowledge Hub"/>
          <SvcDot ok={h.paystack}    label="Paystack Payments"             detail="PAYSTACK_SECRET_KEY"/>
          <SvcDot ok={h.gmail_oauth} label="Gmail / Google OAuth"          detail="GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET"/>
          <SvcDot ok={h.slack_oauth} label="Slack OAuth"                   detail="SLACK_CLIENT_ID + SLACK_CLIENT_SECRET"/>
          <SvcDot ok={h.twitter_oauth} label="Twitter / X OAuth"           detail="TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET"/>
          <SvcDot ok={h.telegram}    label="Telegram Bot"                  detail="TELEGRAM_BOT_TOKEN"/>
          <SvcDot ok={h.resend}      label="Email Delivery (Resend)"       detail="RESEND_API_KEY — password reset emails"/>
          <SvcDot ok={h.admin_secret} label="Admin Secret configured"      detail="ADMIN_SECRET — this panel"/>
        </div>
        <button onClick={()=>loadTab("system")} style={{ alignSelf:"flex-start", background:C.s1, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 20px", color:C.ink, fontSize:14, cursor:"pointer", fontWeight:600 }}>🔄 Re-run Diagnostics</button>
      </div>
    );
  }

  // ── AI Command tab ─────────────────────────────────────────────
  const AI_SUGGESTIONS = [
    "Show all platform metrics with analysis",
    "Simulate 500 new signups this month",
    "Project MRR growth for next 6 months",
    "Which users are most at risk of churn?",
    "Identify the most popular automations",
    "Run a revenue forecast for Q3",
    "What's our conversion rate: trial → paid?",
    "Diagnose any system bottlenecks",
  ];

  function AITab() {
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 130px)", background:C.s1, border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden" }}>
        <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,#A78BFA,${C.sky})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧠</div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>Admin AI Command Center</div>
            <div style={{ fontSize:12, color:"#A78BFA", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#A78BFA", display:"inline-block", animation:"glw 2s ease infinite" }}/>
              Gemini 1.5 Flash — Platform Intelligence Engine
            </div>
          </div>
          <div style={{ marginLeft:"auto", fontSize:11, color:C.sub }}>All data is live from your DB</div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10 }}>
          {aiMsgs.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:"slideDown 0.2s ease" }}>
              <div style={{ maxWidth:"87%", background:m.isError?"rgba(251,113,133,0.08)":m.role==="user"?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.04)", border:`1px solid ${m.isError?"rgba(251,113,133,0.3)":m.role==="user"?"rgba(167,139,250,0.3)":C.border}`, borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"11px 15px", fontSize:14, lineHeight:1.7, color:m.isError?C.rose:m.role==="user"?"#A78BFA":C.ink, whiteSpace:"pre-wrap" }}>
                {m.text}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div style={{ display:"flex", gap:5, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:"16px 16px 16px 4px", width:"fit-content" }}>
              {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#A78BFA", animation:`glw 1.2s ease ${i*0.2}s infinite` }}/>)}
            </div>
          )}
          <div ref={aiEndRef}/>
        </div>
        {aiMsgs.length <= 1 && (
          <div style={{ padding:"0 16px 10px", borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
            <div style={{ fontSize:10, color:C.sub, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>Quick Commands</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:5 }}>
              {AI_SUGGESTIONS.map(s=>(
                <button key={s} onClick={()=>setAiInput(s)} style={{ background:"rgba(167,139,250,0.08)", border:`1px solid rgba(167,139,250,0.18)`, borderRadius:8, padding:"7px 10px", color:"#A78BFA", fontSize:12, cursor:"pointer", textAlign:"left", transition:"all 0.15s", fontFamily:"'DM Sans',sans-serif" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background="rgba(167,139,250,0.16)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background="rgba(167,139,250,0.08)"; }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"flex-end", flexShrink:0 }}>
          <textarea value={aiInput} onChange={e=>setAiInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendAdminAI(); }}}
            placeholder="Ask anything about your platform — simulations, analytics, forecasts…" rows={2}
            style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.ink, fontSize:14, fontFamily:"'DM Sans',sans-serif", resize:"none", outline:"none", lineHeight:1.5 }}
            onFocus={e=>e.target.style.borderColor="rgba(167,139,250,0.5)"}
            onBlur={e=>e.target.style.borderColor=C.border}
          />
          <button onClick={sendAdminAI} disabled={!aiInput.trim()||aiLoading} style={{ width:42, height:42, borderRadius:10, background:aiInput.trim()?"#A78BFA":"rgba(255,255,255,0.06)", border:"none", color:aiInput.trim()?"#fff":C.sub, fontSize:18, cursor:aiInput.trim()?"pointer":"default", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>↑</button>
        </div>
      </div>
    );
  }

  const TAB_CONTENT = { overview:<OverviewTab/>, users:<UsersTab/>, payments:<PaymentsTab/>, automations:<AutomationsTab/>, system:<SystemTab/>, ai:<AITab/> };

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.ink, fontFamily:"'DM Sans',sans-serif", overflow:"hidden" }}>
      <GlobalStyles/>
      {/* ── Admin Sidebar ── */}
      <div style={{ width:224, background:C.s1, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"20px 18px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,#A78BFA,${C.green})`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              <Logo size="xs" onClick={()=>{}}/>
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:15, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>Admin Panel</div>
              <div style={{ fontSize:9, color:C.sub, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em" }}>AutoFlowNG v4.0</div>
            </div>
          </div>
          <div style={{ fontSize:10, color:"rgba(167,139,250,0.7)", fontFamily:"'DM Mono',monospace", padding:"4px 8px", background:"rgba(167,139,250,0.08)", borderRadius:6, display:"inline-block" }}>🔐 Creator Access</div>
        </div>
        <nav style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
          {ADMIN_TABS.map(t=>(
            <button key={t.id} onClick={()=>loadTab(t.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif", textAlign:"left", background:adminNav===t.id?"rgba(167,139,250,0.15)":"transparent", color:adminNav===t.id?"#A78BFA":C.sub, transition:"all 0.15s", position:"relative" }}
            >
              {adminNav===t.id&&<div style={{ position:"absolute", left:0, top:"20%", bottom:"20%", width:3, borderRadius:2, background:"#A78BFA" }}/>}
              <span style={{ fontSize:15 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ padding:"14px 12px", borderTop:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={()=>loadTab("system")}
            style={{ background:"rgba(0,200,150,0.08)", border:`1px solid rgba(0,200,150,0.2)`, borderRadius:8, padding:"8px 12px", color:C.green, fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
            🔄 Refresh Diagnostics
          </button>
          <button onClick={()=>{ localStorage.removeItem("afng_admin_s"); onExit(); }}
            style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.sub, fontSize:12, cursor:"pointer" }}>
            ← Exit to App
          </button>
        </div>
      </div>
      {/* ── Admin Content ── */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        {/* Topbar */}
        <div style={{ padding:"14px 24px", borderBottom:`1px solid ${C.border}`, background:C.s1, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, gap:12 }}>
          <div>
            <div style={{ fontSize:19, fontWeight:900, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.025em", lineHeight:1 }}>
              {ADMIN_TABS.find(t=>t.id===adminNav)?.icon} {ADMIN_TABS.find(t=>t.id===adminNav)?.label}
            </div>
            <div style={{ fontSize:11, color:C.sub, fontFamily:"'DM Mono',monospace", marginTop:3 }}>
              AutoFlowNG Creator Dashboard — {new Date().toLocaleString()}
            </div>
          </div>
          <AdminWorldClock/>
        </div>
        {/* Live clock strip */}
        <div style={{ flex:1, padding:"24px 28px" }}>
          {TAB_CONTENT[adminNav] || <div style={{ color:C.sub }}>Loading…</div>}
        </div>
      </div>
    </div>
  );
}

export default function Root() {
  const [screen, setScreen] = useState("welcome");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const gmail = params.get("gmail");
    const slack = params.get("slack");
    const gmailEmail = params.get("email");
    const slackEmail = params.get("slack_email");
    const errorParam = params.get("error");

    if (errorParam) {
      const errorMessages = {
        gmail_denied: "Gmail access was denied.",
        gmail_session_expired: "Session expired. Please try connecting Gmail again.",
        gmail_token_failed: "Gmail connection failed. Please try again.",
        gmail_failed: "Gmail connection failed. Please try again.",
        google_not_configured: "Google OAuth is not configured yet.",
        slack_failed: "Slack connection failed. Please try again.",
        twitter_denied: "Twitter/X access was denied.",
        twitter_failed: "Twitter/X connection failed. Please try again.",
        twitter_session_expired: "Session expired. Please try connecting Twitter again.",
        twitter_not_configured: "Twitter OAuth is not configured yet.",
        facebook_denied: "Facebook access was denied.",
        facebook_failed: "Facebook connection failed. Please try again.",
        facebook_not_configured: "Facebook OAuth is not configured on this server yet.",
        instagram_denied: "Instagram access was denied.",
        instagram_failed: "Instagram connection failed. Please try again.",
        linkedin_denied: "LinkedIn access was denied.",
        linkedin_failed: "LinkedIn connection failed. Please try again.",
        linkedin_not_configured: "LinkedIn OAuth is not configured on this server yet.",
      };
      localStorage.setItem("autoflowng_oauth_error", errorMessages[errorParam] || "Connection failed.");
    }

    if (token) {
      localStorage.setItem("autoflowng_token", token);
      if (gmail === "connected") {
        localStorage.setItem("autoflowng_gmail_just_connected", gmailEmail || "true");
      }
      if (slack === "connected") {
        localStorage.setItem("autoflowng_slack_just_connected", slackEmail || "true");
      }
      const twitter = params.get("twitter");
      const twitterHandle = params.get("twitter_handle");
      if (twitter === "connected") {
        localStorage.setItem("autoflowng_twitter_just_connected", twitterHandle || "true");
      }
      const facebook = params.get("facebook");
      if (facebook === "connected") {
        localStorage.setItem("autoflowng_facebook_just_connected", "true");
      }
      const instagram = params.get("instagram");
      if (instagram === "connected") {
        localStorage.setItem("autoflowng_instagram_just_connected", "true");
      }
      const linkedin = params.get("linkedin");
      if (linkedin === "connected") {
        localStorage.setItem("autoflowng_linkedin_just_connected", "true");
      }
      setScreen("app");
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      const saved = localStorage.getItem("autoflowng_token");
      if (saved) setScreen("app");
    }
  }, []);

  const [isAdmin, setIsAdmin] = useState(() =>
    new URLSearchParams(window.location.search).get("admin") === "1"
  );

  const handleLogout = () => {
    localStorage.removeItem("autoflowng_token");
    setScreen("landing");
  };

  if (isAdmin) {
    return (
      <ErrorBoundary>
        <AdminDashboard onExit={() => {
          setIsAdmin(false);
          window.history.replaceState({}, "", window.location.pathname);
        }}/>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GlobalStyles/>
      <GradientMesh/>
      <NoiseOverlay/>
      <ScrollProgress/>
      <MagneticCursor/>
      <div style={{ position:"relative", zIndex:2 }}>
        {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onSuccess={(user)=>{ setShowLogin(false); setScreen("app"); }}/>}
        {screen==="welcome" && <WelcomeScreen onEnter={()=>setScreen("landing")}/>}
        {screen==="landing" && <LandingPage onApp={()=>setShowLogin(true)}/>}
        {screen==="app"     && <AppDashboard onBack={handleLogout}/>}
      </div>
    </ErrorBoundary>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500;700&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      html{scroll-behavior:smooth;-webkit-tap-highlight-color:transparent}
      body{background:#04060F;overflow-x:hidden;-webkit-font-smoothing:antialiased}
      @keyframes glw{0%,100%{opacity:1}50%{opacity:0.35}}
      @keyframes fy{from{transform:translateY(0)}to{transform:translateY(-9px)}}
      @keyframes popIn{from{opacity:0;transform:scale(0.93) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes bounceIn{0%{transform:scale(0.3)}50%{transform:scale(1.1)}75%{transform:scale(0.95)}100%{transform:scale(1)}}
      @keyframes marqL{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      @keyframes marqR{from{transform:translateX(-50%)}to{transform:translateX(0)}}
      @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      input::placeholder,textarea::placeholder{color:rgba(232,238,255,0.2)}
      input:focus,textarea:focus,select:focus{outline:none}
      button,a{-webkit-tap-highlight-color:transparent}
      select option{background:#0C1120;color:#E8EEFF}
      img{max-width:100%}
      @media(max-width:640px){
        .desktop-only{display:none!important}
      }
    `}</style>
  );
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW BUILDER PAGE — Make.com-style automation engine
// Build custom automations with triggers, conditions, and actions
// ═══════════════════════════════════════════════════════════════
function WorkflowBuilderPage({ isMobile, connected, toast }) {
  const [view, setView] = useState("list"); // list | builder | run_history
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBuilding, setAiBuilding] = useState(false);
  const [runs, setRuns] = useState([]);
  const [runLoading, setRunLoading] = useState(false);

  const tok = () => localStorage.getItem("autoflowng_token") || "";
  const hdr = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${tok()}` });

  // Load workflows + stats on mount
  useEffect(() => {
    loadWorkflows();
    loadStats();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/workflows`, { headers: hdr() });
      const d = await r.json();
      setWorkflows(d.workflows || []);
    } catch(e) {} finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const r = await fetch(`${API_BASE}/api/workflows/stats/overview`, { headers: hdr() });
      const d = await r.json();
      setStats(d);
    } catch(e) {}
  };

  const loadRuns = async (wfId) => {
    setRunLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/workflows/${wfId}/runs`, { headers: hdr() });
      const d = await r.json();
      setRuns(d.runs || []);
    } catch(e) {} finally { setRunLoading(false); }
  };

  const toggleWorkflow = async (wf) => {
    try {
      const r = await fetch(`${API_BASE}/api/workflows/${wf.id}/toggle`, { method:"POST", headers: hdr() });
      const d = await r.json();
      setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, is_active: d.is_active } : w));
      toast(d.is_active ? `"${wf.name}" activated ✅` : `"${wf.name}" paused ⏸`);
      loadStats();
    } catch(e) { toast("Failed to toggle workflow"); }
  };

  const runWorkflow = async (wf) => {
    try {
      toast(`Running "${wf.name}"... ⚡`);
      await fetch(`${API_BASE}/api/workflows/${wf.id}/run`, { method:"POST", headers: hdr() });
      setTimeout(() => { loadWorkflows(); loadStats(); }, 2000);
    } catch(e) { toast("Failed to run workflow"); }
  };

  const deleteWorkflow = async (wf) => {
    if (!window.confirm(`Delete "${wf.name}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API_BASE}/api/workflows/${wf.id}`, { method:"DELETE", headers: hdr() });
      setWorkflows(prev => prev.filter(w => w.id !== wf.id));
      toast("Workflow deleted");
      if (selected?.id === wf.id) { setSelected(null); setView("list"); }
      loadStats();
    } catch(e) { toast("Failed to delete"); }
  };

  const buildWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiBuilding(true);
    try {
      const connectedIds = (connected || []).map(c => c.id);
      const r = await fetch(`${API_BASE}/api/workflows/ai-build`, {
        method:"POST", headers: hdr(),
        body: JSON.stringify({ description: aiPrompt, connected_platforms: connectedIds })
      });
      const d = await r.json();
      if (d.error) { toast("AI build failed: " + d.error); return; }
      setSelected({ ...d.workflow, steps: d.workflow.steps || [], isNew: true });
      setView("builder");
      toast("Workflow generated by AI! Review and save. ✨");
    } catch(e) { toast("AI build failed — check your internet"); }
    finally { setAiBuilding(false); }
  };

  const saveWorkflow = async (wfData) => {
    try {
      const isNew = !wfData.id || wfData.isNew;
      const url = isNew ? `${API_BASE}/api/workflows` : `${API_BASE}/api/workflows/${wfData.id}`;
      const method = isNew ? "POST" : "PUT";
      const r = await fetch(url, { method, headers: hdr(), body: JSON.stringify(wfData) });
      const d = await r.json();
      if (d.error) { toast("Save failed: " + d.error); return; }
      toast(isNew ? "Workflow created! ✅" : "Workflow saved! ✅");
      loadWorkflows();
      setView("list");
      setSelected(null);
    } catch(e) { toast("Save failed"); }
  };

  // ── STEP TYPES catalog ─────────────────────────────────────────
  const STEP_TYPES = [
    { type:"ai_generate",    icon:"🤖", label:"AI Generate",      color:"#A78BFA", desc:"Generate text using AutoFlowNG AI" },
    { type:"gmail_send",     icon:"📧", label:"Send Email",        color:"#00C896", desc:"Send email via Gmail" },
    { type:"gmail_reply",    icon:"↩️", label:"Reply Email",       color:"#00C896", desc:"Reply to an email thread" },
    { type:"twitter_post",   icon:"🐦", label:"Tweet",             color:"#38BDF8", desc:"Post to Twitter/X" },
    { type:"linkedin_post",  icon:"💼", label:"LinkedIn Post",     color:"#0A66C2", desc:"Publish to LinkedIn" },
    { type:"facebook_post",  icon:"📘", label:"Facebook Post",     color:"#1877F2", desc:"Post to Facebook page" },
    { type:"slack_post",     icon:"💬", label:"Slack Message",     color:"#E01E5A", desc:"Post to Slack channel" },
    { type:"telegram_send",  icon:"✈️", label:"Telegram Message",  color:"#2AABEE", desc:"Send Telegram message" },
    { type:"whatsapp_send",  icon:"📱", label:"WhatsApp Message",  color:"#25D366", desc:"Send WhatsApp message" },
    { type:"condition",      icon:"🔀", label:"Condition",         color:"#FBBF24", desc:"If/else branch logic" },
    { type:"delay",          icon:"⏱",  label:"Delay",             color:"#6B7280", desc:"Wait before next step" },
    { type:"webhook_call",   icon:"🔗", label:"Webhook",           color:"#F97316", desc:"Call any external URL" },
    { type:"set_variable",   icon:"📌", label:"Set Variable",      color:"#EC4899", desc:"Store a value for later" },
  ];

  const TRIGGER_TYPES = [
    { value:"manual",   label:"▶ Manual — run on demand" },
    { value:"schedule", label:"⏰ Schedule — run on a timer" },
    { value:"webhook",  label:"🔗 Webhook — triggered by event" },
  ];

  // ── STATS BAR ──────────────────────────────────────────────────
  const StatsBar = () => (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
      {[
        { label:"Active Workflows", value: stats?.active_workflows ?? "—", color:C.green, icon:"⚡" },
        { label:"Total Runs",       value: stats?.total_runs ?? "—",       color:C.sky,   icon:"▶" },
        { label:"Successful",       value: stats?.successful_runs ?? "—",  color:C.green, icon:"✅" },
        { label:"Success Rate",     value: stats?.total_runs > 0 ? Math.round((stats.successful_runs/stats.total_runs)*100)+"%" : "—", color:C.violet, icon:"📊" },
      ].map(s => (
        <div key={s.label} style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px" }}>
          <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
          <div style={{ fontSize:22, fontWeight:900, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.value}</div>
          <div style={{ fontSize:12, color:C.sub }}>{s.label}</div>
        </div>
      ))}
    </div>
  );

  // ── WORKFLOW LIST VIEW ─────────────────────────────────────────
  if (view === "list") return (
    <div>
      <StatsBar />

      {/* AI Builder prompt */}
      <div style={{ background:`linear-gradient(135deg,rgba(167,139,250,0.08),rgba(0,200,150,0.08))`, border:`1px solid rgba(167,139,250,0.2)`, borderRadius:16, padding:"20px 24px", marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:16, fontFamily:"'Syne',sans-serif", marginBottom:4 }}>✨ Build with AI</div>
        <div style={{ fontSize:13, color:C.sub, marginBottom:14 }}>Describe your automation in plain English — AI generates the full workflow instantly</div>
        <div style={{ display:"flex", gap:10 }}>
          <input
            value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") buildWithAI(); }}
            placeholder='e.g. "Every morning, generate a social media post and tweet it, then post to LinkedIn"'
            style={{ flex:1, background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", color:C.ink, fontSize:14, outline:"none" }}
          />
          <button onClick={buildWithAI} disabled={aiBuilding || !aiPrompt.trim()} style={{ background:aiBuilding?"rgba(167,139,250,0.4)":"#A78BFA", color:"#000", border:"none", borderRadius:10, padding:"0 20px", fontWeight:800, fontSize:14, cursor:aiBuilding?"default":"pointer", fontFamily:"'Syne',sans-serif", whiteSpace:"nowrap" }}>
            {aiBuilding ? "Building…" : "Build Workflow ✨"}
          </button>
        </div>
      </div>

      {/* Create manually button */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontWeight:800, fontSize:16, fontFamily:"'Syne',sans-serif" }}>Your Workflows ({workflows.length})</div>
        <button onClick={()=>{ setSelected({ name:"New Workflow", description:"", trigger_type:"manual", trigger_config:{}, steps:[], isNew:true }); setView("builder"); }}
          style={{ background:C.green, color:"#000", border:"none", borderRadius:10, padding:"9px 18px", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>
          + New Workflow
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:C.sub }}>Loading workflows…</div>
      ) : workflows.length === 0 ? (
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:"48px 32px", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🔧</div>
          <div style={{ fontWeight:800, fontSize:18, marginBottom:8, fontFamily:"'Syne',sans-serif" }}>No workflows yet</div>
          <div style={{ color:C.sub, fontSize:14, marginBottom:20 }}>Use AI to generate your first workflow, or create one manually</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {workflows.map(wf => {
            const steps = Array.isArray(wf.steps) ? wf.steps : JSON.parse(wf.steps||"[]");
            return (
              <div key={wf.id} style={{ background:C.s1, border:`1px solid ${wf.is_active ? "rgba(0,200,150,0.3)" : C.border}`, borderRadius:16, padding:"16px 20px", transition:"border 0.2s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:2 }}>{wf.name}</div>
                    <div style={{ fontSize:13, color:C.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{wf.description || `${steps.length} steps · ${wf.trigger_type} trigger · ${wf.run_count||0} runs`}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <Chip color={wf.is_active ? C.green : C.sub}>{wf.is_active ? "Active" : "Paused"}</Chip>
                  </div>
                </div>

                {/* Step type pills */}
                {steps.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                    {steps.slice(0,5).map((step,i) => {
                      const st = STEP_TYPES.find(s=>s.type===step.type);
                      return <span key={i} style={{ background:`${st?.color||"#666"}18`, color:st?.color||"#666", border:`1px solid ${st?.color||"#666"}30`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{st?.icon} {st?.label||step.type}</span>;
                    })}
                    {steps.length > 5 && <span style={{ fontSize:11, color:C.sub }}>+{steps.length-5} more</span>}
                  </div>
                )}

                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button onClick={()=>toggleWorkflow(wf)} style={{ background:wf.is_active?"rgba(251,191,36,0.1)":"rgba(0,200,150,0.1)", color:wf.is_active?C.amber:C.green, border:`1px solid ${wf.is_active?"rgba(251,191,36,0.3)":"rgba(0,200,150,0.3)"}`, borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {wf.is_active ? "⏸ Pause" : "▶ Activate"}
                  </button>
                  <button onClick={()=>runWorkflow(wf)} style={{ background:"rgba(56,189,248,0.1)", color:C.sky, border:`1px solid rgba(56,189,248,0.3)`, borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    ⚡ Run Now
                  </button>
                  <button onClick={()=>{ setSelected(wf); setView("builder"); }} style={{ background:"rgba(255,255,255,0.05)", color:C.ink, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    ✏️ Edit
                  </button>
                  <button onClick={()=>{ setSelected(wf); loadRuns(wf.id); setView("run_history"); }} style={{ background:"rgba(255,255,255,0.05)", color:C.sub, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px", fontSize:13, cursor:"pointer" }}>
                    📋 History
                  </button>
                  <button onClick={()=>deleteWorkflow(wf)} style={{ background:"rgba(248,113,113,0.08)", color:C.rose, border:`1px solid rgba(248,113,113,0.2)`, borderRadius:8, padding:"6px 14px", fontSize:13, cursor:"pointer" }}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── RUN HISTORY VIEW ───────────────────────────────────────────
  if (view === "run_history") return (
    <div>
      <button onClick={()=>setView("list")} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:8, padding:"8px 16px", cursor:"pointer", marginBottom:20 }}>← Back to Workflows</button>
      <div style={{ fontWeight:800, fontSize:18, fontFamily:"'Syne',sans-serif", marginBottom:16 }}>Run History: {selected?.name}</div>
      {runLoading ? <div style={{ color:C.sub, padding:20 }}>Loading…</div> : runs.length === 0 ? (
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"32px", textAlign:"center", color:C.sub }}>No runs yet — click "Run Now" to execute this workflow</div>
      ) : runs.map(run => {
        const logs = Array.isArray(run.logs) ? run.logs : JSON.parse(run.logs||"[]");
        const stColor = run.status==="completed"?C.green:run.status==="failed"?C.rose:C.amber;
        return (
          <div key={run.id} style={{ background:C.s1, border:`1px solid ${stColor}30`, borderRadius:14, padding:"16px 20px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <div>
                <Chip color={stColor}>{run.status}</Chip>
                <span style={{ marginLeft:10, fontSize:13, color:C.sub }}>{new Date(run.started_at).toLocaleString()}</span>
              </div>
              <div style={{ fontSize:13, color:C.sub }}>{run.steps_completed}/{run.steps_total} steps</div>
            </div>
            {run.error && <div style={{ background:"rgba(248,113,113,0.08)", border:`1px solid rgba(248,113,113,0.2)`, borderRadius:8, padding:"8px 12px", color:C.rose, fontSize:13, marginBottom:8 }}>❌ {run.error}</div>}
            {logs.length > 0 && (
              <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:8, padding:"10px 14px", maxHeight:180, overflowY:"auto" }}>
                {logs.map((step,i) => (
                  <div key={i} style={{ marginBottom:6 }}>
                    <div style={{ fontSize:12, color:C.sub, fontFamily:"monospace" }}>Step {step.step+1}: {step.type}</div>
                    {(step.logs||[]).map((l,j) => (
                      <div key={j} style={{ fontSize:12, color:l.status==="error"?C.rose:l.status==="warn"?C.amber:C.green, fontFamily:"monospace", paddingLeft:12 }}>
                        [{l.ts?.slice(11,19)||"--"}] {l.msg}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── WORKFLOW BUILDER VIEW ──────────────────────────────────────
  return <WorkflowEditor workflow={selected} onSave={saveWorkflow} onBack={()=>{ setSelected(null); setView("list"); }} STEP_TYPES={STEP_TYPES} TRIGGER_TYPES={TRIGGER_TYPES} toast={toast} />;
}

// ─── WORKFLOW EDITOR ──────────────────────────────────────────────
function WorkflowEditor({ workflow, onSave, onBack, STEP_TYPES, TRIGGER_TYPES, toast }) {
  const [name, setName] = useState(workflow?.name || "New Workflow");
  const [description, setDescription] = useState(workflow?.description || "");
  const [triggerType, setTriggerType] = useState(workflow?.trigger_type || "manual");
  const [triggerConfig, setTriggerConfig] = useState(
    typeof workflow?.trigger_config === "string" ? JSON.parse(workflow.trigger_config||"{}") : workflow?.trigger_config || {}
  );
  const [steps, setSteps] = useState(
    typeof workflow?.steps === "string" ? JSON.parse(workflow.steps||"[]") : workflow?.steps || []
  );
  const [saving, setSaving] = useState(false);
  const [addingStep, setAddingStep] = useState(false);

  const addStep = (type) => {
    const st = STEP_TYPES.find(s => s.type === type);
    const defaultConfig = {
      ai_generate:   { prompt:"Write a professional social media post about {{topic}}", max_tokens:300 },
      gmail_send:    { to:"{{email}}", subject:"Automated message from AutoFlowNG", body:"{{ai_output}}" },
      gmail_reply:   { body:"{{ai_output}}" },
      twitter_post:  { text:"{{ai_output}}" },
      linkedin_post: { text:"{{ai_output}}" },
      facebook_post: { text:"{{ai_output}}" },
      slack_post:    { text:"{{ai_output}}", channel:"general" },
      telegram_send: { text:"{{ai_output}}" },
      whatsapp_send: { to:"", text:"{{ai_output}}" },
      condition:     { value:"{{ai_output}}", operator:"not_empty", compare:"" },
      delay:         { seconds:5 },
      webhook_call:  { url:"", method:"POST", body:{} },
      set_variable:  { key:"my_variable", value:"" },
    }[type] || {};

    const newStep = { id: String(Date.now()), type, name: st?.label || type, config: defaultConfig };
    setSteps(prev => [...prev, newStep]);
    setAddingStep(false);
  };

  const updateStep = (idx, updates) => {
    setSteps(prev => prev.map((s,i) => i===idx ? { ...s, ...updates } : s));
  };

  const updateStepConfig = (idx, key, value) => {
    setSteps(prev => prev.map((s,i) => i===idx ? { ...s, config: { ...s.config, [key]: value } } : s));
  };

  const removeStep = (idx) => setSteps(prev => prev.filter((_,i) => i!==idx));

  const moveStep = (idx, dir) => {
    const newSteps = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[idx], newSteps[target]] = [newSteps[target], newSteps[idx]];
    setSteps(newSteps);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast("Workflow name is required"); return; }
    if (steps.length === 0) { toast("Add at least one step"); return; }
    setSaving(true);
    await onSave({ ...workflow, name, description, trigger_type: triggerType, trigger_config: triggerConfig, steps, is_active: workflow?.is_active || false });
    setSaving(false);
  };

  const inputS = { width:"100%", background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.ink, fontSize:14, outline:"none", boxSizing:"border-box" };
  const labelS = { fontSize:13, color:C.sub, marginBottom:5, display:"block", fontWeight:600 };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <button onClick={onBack} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:8, padding:"8px 16px", cursor:"pointer" }}>← Back</button>
        <button onClick={handleSave} disabled={saving} style={{ background:saving?"rgba(0,200,150,0.4)":C.green, color:"#000", border:"none", borderRadius:10, padding:"10px 24px", fontWeight:800, fontSize:14, cursor:saving?"default":"pointer", fontFamily:"'Syne',sans-serif" }}>
          {saving ? "Saving…" : "Save Workflow ✅"}
        </button>
      </div>

      {/* Workflow meta */}
      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 24px", marginBottom:16 }}>
        <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:16 }}>⚙️ Workflow Settings</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
          <div>
            <label style={labelS}>Workflow Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={inputS} placeholder="My Workflow" />
          </div>
          <div>
            <label style={labelS}>Trigger</label>
            <select value={triggerType} onChange={e=>setTriggerType(e.target.value)} style={{ ...inputS, cursor:"pointer" }}>
              {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={labelS}>Description (optional)</label>
          <input value={description} onChange={e=>setDescription(e.target.value)} style={inputS} placeholder="What does this workflow do?" />
        </div>
        {triggerType === "schedule" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={labelS}>Every</label>
              <input type="number" min="1" value={triggerConfig.interval_amount||1} onChange={e=>setTriggerConfig(p=>({...p,interval_amount:e.target.value}))} style={inputS} />
            </div>
            <div>
              <label style={labelS}>Unit</label>
              <select value={triggerConfig.interval_unit||"hours"} onChange={e=>setTriggerConfig(p=>({...p,interval_unit:e.target.value}))} style={{ ...inputS, cursor:"pointer" }}>
                {["minutes","hours","days","weeks"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        )}
        {triggerType === "webhook" && (
          <div style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#F97316" }}>
            🔗 Webhook URL: <code style={{ background:"rgba(0,0,0,0.3)", padding:"2px 8px", borderRadius:4 }}>{`${API_BASE}/api/workflows/${workflow?.id||"<id>"}/run`}</code>
            <br/>POST to this URL to trigger the workflow externally.
          </div>
        )}
      </div>

      {/* Steps */}
      <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:12 }}>
        Steps ({steps.length}) <span style={{ fontWeight:400, fontSize:13, color:C.sub }}>— executed top to bottom</span>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        {steps.map((step, idx) => {
          const st = STEP_TYPES.find(s => s.type === step.type);
          return (
            <div key={step.id||idx} style={{ background:C.s1, border:`1px solid ${st?.color||C.border}20`, borderRadius:14, overflow:"hidden" }}>
              {/* Step header */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${st?.color||"#666"}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{st?.icon||"⚙️"}</div>
                <div style={{ flex:1, display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ fontSize:13, fontWeight:800, color:st?.color||C.ink }}>{st?.label||step.type}</span>
                  <input value={step.name||""} onChange={e=>updateStep(idx,{name:e.target.value})}
                    style={{ background:"transparent", border:"none", color:C.sub, fontSize:13, outline:"none", flex:1 }}
                    placeholder="Step name…" />
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={()=>moveStep(idx,-1)} disabled={idx===0} style={{ background:"none", border:"none", color:C.sub, cursor:"pointer", fontSize:16, opacity:idx===0?0.3:1 }}>↑</button>
                  <button onClick={()=>moveStep(idx,1)} disabled={idx===steps.length-1} style={{ background:"none", border:"none", color:C.sub, cursor:"pointer", fontSize:16, opacity:idx===steps.length-1?0.3:1 }}>↓</button>
                  <button onClick={()=>removeStep(idx)} style={{ background:"rgba(248,113,113,0.1)", border:"none", color:C.rose, cursor:"pointer", borderRadius:6, padding:"2px 8px", fontSize:12 }}>✕</button>
                </div>
              </div>

              {/* Step config */}
              <div style={{ padding:"12px 16px" }}>
                {Object.entries(step.config||{}).map(([key, val]) => (
                  <div key={key} style={{ marginBottom:10 }}>
                    <label style={{ ...labelS, textTransform:"capitalize" }}>{key.replace(/_/g," ")}</label>
                    {key === "operator" ? (
                      <select value={val} onChange={e=>updateStepConfig(idx,key,e.target.value)} style={{ ...inputS, cursor:"pointer" }}>
                        {["contains","equals","not_empty","greater_than"].map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : key === "method" ? (
                      <select value={val} onChange={e=>updateStepConfig(idx,key,e.target.value)} style={{ ...inputS, cursor:"pointer" }}>
                        {["POST","GET","PUT","PATCH","DELETE"].map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : key === "seconds" || key === "max_tokens" ? (
                      <input type="number" value={val} onChange={e=>updateStepConfig(idx,key,parseInt(e.target.value)||0)} style={inputS} />
                    ) : typeof val === "object" ? (
                      <textarea value={JSON.stringify(val,null,2)} onChange={e=>{ try{updateStepConfig(idx,key,JSON.parse(e.target.value))}catch(_){} }} rows={3} style={{ ...inputS, resize:"vertical", fontFamily:"monospace", fontSize:12 }} />
                    ) : (
                      <textarea value={val} onChange={e=>updateStepConfig(idx,key,e.target.value)} rows={key==="prompt"||key==="body"||key==="text"?3:1} style={{ ...inputS, resize:key==="prompt"||key==="body"||key==="text"?"vertical":"none" }} placeholder={key==="prompt"?"Write a post about {{topic}}…":key==="body"?"{{ai_output}}":""} />
                    )}
                  </div>
                ))}
                {step.type!=="delay" && step.type!=="set_variable" && (
                  <div style={{ fontSize:11, color:C.sub, marginTop:4 }}>
                    💡 Use <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 5px", borderRadius:3 }}>{`{{ai_output}}`}</code>, <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 5px", borderRadius:3 }}>{`{{user_name}}`}</code>, <code style={{ background:"rgba(255,255,255,0.08)", padding:"1px 5px", borderRadius:3 }}>{`{{timestamp}}`}</code> as dynamic values
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add step */}
      {addingStep ? (
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 20px" }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>Choose step type:</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:8 }}>
            {STEP_TYPES.map(st => (
              <button key={st.type} onClick={()=>addStep(st.type)} style={{ background:`${st.color}10`, border:`1px solid ${st.color}30`, borderRadius:10, padding:"10px 12px", color:st.color, cursor:"pointer", textAlign:"left", fontSize:13, fontWeight:700 }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{st.icon}</div>
                <div>{st.label}</div>
                <div style={{ fontWeight:400, fontSize:11, color:C.sub, marginTop:2 }}>{st.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={()=>setAddingStep(false)} style={{ marginTop:12, background:"none", border:`1px solid ${C.border}`, color:C.sub, borderRadius:8, padding:"6px 16px", cursor:"pointer" }}>Cancel</button>
        </div>
      ) : (
        <button onClick={()=>setAddingStep(true)} style={{ width:"100%", background:"rgba(0,200,150,0.06)", border:`2px dashed rgba(0,200,150,0.3)`, borderRadius:14, padding:"16px", color:C.green, fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>
          + Add Step
        </button>
      )}
    </div>
  );
}
