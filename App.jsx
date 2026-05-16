import { useState, useEffect, useRef } from "react";

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
function Logo({ size = "md", onClick, white }) {
  const sz = { xs: 28, sm: 32, md: 38, lg: 56, xl: 80 }[size] || 38;
  const fs = { xs: 14, sm: 16, md: 18, lg: 28, xl: 42 }[size] || 18;
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: sz * 0.28, cursor: onClick ? "pointer" : "default", userSelect: "none" }}>
      <svg width={sz} height={sz} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <rect width="44" height="44" rx="11" fill="url(#grad_logo)" />
        {/* Outer ring arc */}
        <circle cx="22" cy="22" r="13" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeDasharray="4 3" />
        {/* Center hub */}
        <circle cx="22" cy="22" r="5.5" fill="white" opacity="0.95" />
        <circle cx="22" cy="22" r="2.8" fill="url(#grad_logo)" />
        {/* 4 orbital nodes with lines */}
        <line x1="22" y1="9" x2="22" y2="16.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="22" y1="27.5" x2="22" y2="35" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="9" y1="22" x2="16.5" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="27.5" y1="22" x2="35" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" strokeLinecap="round" />
        {/* Orbital dots */}
        <circle cx="22" cy="8" r="2.5" fill="#00C896" />
        <circle cx="36" cy="22" r="2.5" fill="#38BDF8" />
        <circle cx="22" cy="36" r="2.5" fill="white" opacity="0.7" />
        <circle cx="8" cy="22" r="2.5" fill="white" opacity="0.5" />
        <defs>
          <linearGradient id="grad_logo" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00C896" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ display: "flex", alignItems: "baseline", gap: 0, lineHeight: 1 }}>
        <span style={{ fontSize: fs, fontWeight: 900, letterSpacing: "-0.045em", fontFamily: "'Syne', sans-serif", color: white ? "white" : C.ink }}>Auto</span>
        <span style={{ fontSize: fs, fontWeight: 900, letterSpacing: "-0.045em", fontFamily: "'Syne', sans-serif", color: C.green }}>Flow</span>
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
      {/* Radial glow */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 55% at 50% 46%, rgba(0,200,150,0.08) 0%, transparent 68%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: mobile ? "0 20px" : "0 32px", width: "100%", maxWidth: 720 }}>
        {/* Logo */}
        <Fade show={phase >= 0} dy={24} delay={0} style={{ display: "flex", justifyContent: "center", marginBottom: mobile ? 32 : 44 }}>
          <Logo size={mobile ? "lg" : "xl"} />
        </Fade>

        {/* Headline */}
        <Fade show={phase >= 1} dy={20} delay={0.05} style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: mobile ? "clamp(28px,8vw,40px)" : "clamp(38px,5.5vw,62px)", fontWeight: 900, letterSpacing: "-0.045em", fontFamily: "'Syne', sans-serif", lineHeight: 1.06, color: C.ink, margin: 0 }}>
            The Platform That Works<br />
            <span style={{ background: `linear-gradient(90deg, ${C.green}, ${C.sky})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              While You Sleep
            </span>
          </h1>
        </Fade>

        {/* Sub */}
        <Fade show={phase >= 2} dy={16} delay={0.05} style={{ marginBottom: mobile ? 36 : 44 }}>
          <p style={{ fontSize: mobile ? 15 : 18, color: C.sub, lineHeight: 1.75, maxWidth: 480, margin: "0 auto" }}>
            Connect every channel. Automate every task.<br />Your AI handles your business — 24 hours a day.
          </p>
        </Fade>

        {/* CTA */}
        <Fade show={phase >= 3} dy={14} delay={0.05}>
          <button onClick={go} style={{ background: `linear-gradient(135deg, ${C.green}, #0EA5E9)`, color: "#000", border: "none", padding: mobile ? "16px 40px" : "19px 56px", borderRadius: 14, fontSize: mobile ? 15 : 17, fontWeight: 800, fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: `0 0 72px rgba(0,200,150,0.42), 0 4px 20px rgba(0,0,0,0.35)`, transition: "transform 0.2s, box-shadow 0.2s", letterSpacing: "-0.01em" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px) scale(1.02)"; e.currentTarget.style.boxShadow = `0 0 100px rgba(0,200,150,0.55), 0 8px 32px rgba(0,0,0,0.4)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 0 72px rgba(0,200,150,0.42), 0 4px 20px rgba(0,0,0,0.35)`; }}
          >
            Enter Platform →
          </button>
        </Fade>
      </div>

      {/* Bottom stats bar */}
      <Fade show={phase >= 3} dy={0} delay={0.3} style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        <div style={{ borderTop: `1px solid ${C.border}`, background: "rgba(4,6,15,0.75)", backdropFilter: "blur(16px)", display: "flex" }}>
          {[["500+", "Businesses"], ["10M+", "Actions Run"], ["99.9%", "Uptime"], ["24/7", "Always On"]].map(([v, l], i) => (
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
// ── REGIONAL PRICING ──────────────────────────────────────────
const AFRICA_TIMEZONES = [
  "Africa/Lagos","Africa/Accra","Africa/Nairobi","Africa/Johannesburg",
  "Africa/Kampala","Africa/Dar_es_Salaam","Africa/Addis_Ababa","Africa/Cairo",
  "Africa/Casablanca","Africa/Tunis","Africa/Algiers","Africa/Khartoum",
  "Africa/Douala","Africa/Abidjan","Africa/Dakar","Africa/Luanda",
  "Africa/Harare","Africa/Lusaka","Africa/Maputo","Africa/Kigali",
  "Africa/Bujumbura","Africa/Djibouti","Africa/Mogadishu","Africa/Asmara",
  "Africa/Bamako","Africa/Conakry","Africa/Freetown","Africa/Monrovia",
  "Africa/Ouagadougou","Africa/Lome","Africa/Porto-Novo","Africa/Niamey",
  "Africa/Ndjamena","Africa/Bangui","Africa/Libreville","Africa/Malabo",
  "Africa/Kinshasa","Africa/Brazzaville","Africa/Gaborone","Africa/Maseru",
  "Africa/Mbabane","Africa/Windhoek","Africa/Blantyre","Africa/Antananarivo",
];

function detectRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const locale = navigator.language || "";
    if (AFRICA_TIMEZONES.some(z => tz.startsWith(z.split("/")[0]) && tz === z)) return "africa";
    if (tz.startsWith("Africa/")) return "africa";
    if (locale.includes("NG") || locale.includes("GH") || locale.includes("KE") || locale.includes("ZA")) return "africa";
    return "western";
  } catch { return "western"; }
}

const NGN_PLANS = [
  { name:"Starter",    price:"₦15,000",   symbol:"₦", amount:15000,  color:C.sky,   currency:"NGN", tagline:"For solo business owners",         features:["3 platform connections","5 active automations","1,000 automated actions/mo","Email & chat support","Analytics dashboard"] },
  { name:"Business",   price:"₦30,000",   symbol:"₦", amount:30000,  color:C.green, currency:"NGN", tagline:"Most chosen by growing teams",      popular:true, features:["All 10+ platforms","Unlimited automations","50,000 automated actions/mo","Full AI agent access","Priority 24/7 support","Advanced analytics","Up to 5 team members"] },
  { name:"Enterprise", price:"₦50,000",   symbol:"₦", amount:50000,  color:C.amber, currency:"NGN", tagline:"For serious, scaling operations",   features:["Everything in Business","Unlimited actions","Custom AI workflows","Dedicated account manager","Full API access","White-label ready","Unlimited team seats"] },
];
const USD_PLANS = [
  { name:"Starter",    price:"$49",        symbol:"$", amount:4900,   color:C.sky,   currency:"USD", tagline:"For solo business owners",         features:["3 platform connections","5 active automations","1,000 automated actions/mo","Email & chat support","Analytics dashboard"] },
  { name:"Business",   price:"$149",       symbol:"$", amount:14900,  color:C.green, currency:"USD", tagline:"Most chosen by growing teams",      popular:true, features:["All 10+ platforms","Unlimited automations","50,000 automated actions/mo","Full AI agent access","Priority 24/7 support","Advanced analytics","Up to 5 team members"] },
  { name:"Enterprise", price:"$299",       symbol:"$", amount:29900,  color:C.amber, currency:"USD", tagline:"For serious, scaling operations",   features:["Everything in Business","Unlimited actions","Custom AI workflows","Dedicated account manager","Full API access","White-label ready","Unlimited team seats"] },
];
const PLANS = NGN_PLANS; // default — overridden by region in components

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

// Button backgrounds & text for each platform (fixes black-on-black for Twitter/TikTok)
const PLATFORM_BTN_BG = {
  gmail:     "#EA4335",
  outlook:   "#0078D4",
  whatsapp:  "#25D366",
  telegram:  "#2AABEE",
  slack:     "#611F69",
  instagram: "#E1306C",
  facebook:  "#1877F2",
  twitter:   "#1D9BF0",   // Use Twitter blue instead of black for button
  linkedin:  "#0A66C2",
  tiktok:    "#FF2D55",   // Use TikTok red instead of black for button
};

const PLATFORM_BTN_TEXT = {
  gmail:     "#fff",
  outlook:   "#fff",
  whatsapp:  "#fff",
  telegram:  "#fff",
  slack:     "#fff",
  instagram: "#fff",
  facebook:  "#fff",
  twitter:   "#fff",
  linkedin:  "#fff",
  tiktok:    "#fff",
};

// ── Official circular brand logos — styled like reference image ─
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
        {/* Cyan shadow */}
        <path d="M31.5 15a6 6 0 01-4.5-2.5V28a5.5 5.5 0 01-5.5 5.5 5.5 5.5 0 01-5.5-5.5 5.5 5.5 0 015.5-5.5c.4 0 .8.1 1.2.2v-4.3a9.8 9.8 0 00-1.2-.1 9.7 9.7 0 00-9.7 9.7 9.7 9.7 0 009.7 9.7 9.7 9.7 0 009.7-9.7V19a10.2 10.2 0 006 1.9v-4a6 6 0 01-5.7-1.9z" fill="#69C9D0" transform="translate(-1,1)"/>
        {/* Red shadow */}
        <path d="M31.5 15a6 6 0 01-4.5-2.5V28a5.5 5.5 0 01-5.5 5.5 5.5 5.5 0 01-5.5-5.5 5.5 5.5 0 015.5-5.5c.4 0 .8.1 1.2.2v-4.3a9.8 9.8 0 00-1.2-.1 9.7 9.7 0 00-9.7 9.7 9.7 9.7 0 009.7 9.7 9.7 9.7 0 009.7-9.7V19a10.2 10.2 0 006 1.9v-4a6 6 0 01-5.7-1.9z" fill="#EE1D52" transform="translate(1,-1)"/>
        {/* White main */}
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

// Clean circular platform tile — exactly like the reference image
function PlatformTile({ id, size = 44, showName = false }) {
  const p = PLATFORMS.find(x => x.id === id);
  if (!p) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        width: size, height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 3px 14px ${p.color}45, 0 1px 4px rgba(0,0,0,0.2)`,
        transition: "box-shadow 0.2s, transform 0.2s",
      }}>
        <PlatformLogo id={id} size={size}/>
      </div>
      {showName && <span style={{ fontSize: 11, color: C.sub, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap" }}>{p.name}</span>}
    </div>
  );
}

const FEATURES = [
  { icon: "⚡", title: "Instant Triggers", desc: "React in milliseconds. New message, new order, new follower — your automations fire the second it happens.", color: C.amber },
  { icon: "🤖", title: "AI Agent", desc: "A digital employee that reads, writes, replies and follows up across every platform you own — all day, every day.", color: C.green },
  { icon: "🔗", title: "10+ Integrations", desc: "Gmail, WhatsApp, Instagram, Twitter, Facebook, LinkedIn, TikTok, Telegram, Slack, and Outlook — all in one place.", color: C.sky },
  { icon: "📅", title: "Smart Scheduling", desc: "AI calculates your audience's peak engagement times and posts at exactly the right moment — automatically.", color: C.violet },
  { icon: "📊", title: "Live Analytics", desc: "See every action, every reply, every lead captured — updated in real time on your personal dashboard.", color: C.rose },
  { icon: "🛡", title: "Enterprise Security", desc: "AES-256 encryption, AI fraud detection, CSRF protection, and rate limiting — the same standards used by global banks.", color: C.green },
];

const TESTIMONIALS = [
  { name: "Chiamaka Okonkwo", role: "Fashion Brand Owner · Lagos", avatar: "C", color: "#E1306C", stars: 5, text: "Before AutoFlowNG, I spent 4 hours daily replying to Instagram DMs and WhatsApp messages. Now the AI handles everything — order confirmations, price enquiries, follow-ups. My sales went up 60% in two months because I stopped losing customers who didn't get a quick reply. Best investment I've made for my brand." },
  { name: "Emeka Obi", role: "Real Estate Agent · Abuja", avatar: "E", color: "#38BDF8", stars: 5, text: "I was missing leads because I couldn't respond fast enough. AutoFlowNG now instantly messages every person who fills my contact form, schedules a call, and sends property details automatically. I closed 3 deals last month that I would have lost before. This tool pays for itself every single week." },
  { name: "Ngozi Adeyemi", role: "Digital Marketing Consultant · Port Harcourt", avatar: "N", color: "#A78BFA", stars: 5, text: "I manage social media for 8 clients. AutoFlowNG schedules content, replies to comments, and sends performance reports — all without me touching a button. I went from working 12-hour days to finishing by 2pm. My clients think I hired extra staff. I pay ₦30,000 a month and save over ₦500,000 in time." },
];

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
  return <span style={{ display:"inline-flex",alignItems:"center",gap:6,background:color+"15",border:`1px solid ${color}30`,color,borderRadius:20,padding:"4px 13px",fontSize:12,fontWeight:700,letterSpacing:"0.04em",fontFamily:"'DM Mono',monospace" }}>{dot&&<span style={{width:6,height:6,borderRadius:"50%",background:color,display:"inline-block",animation:"glw 2s ease infinite"}}/>}{children}</span>;
}

function Stars({ n=5 }) {
  return <div style={{display:"flex",gap:2}}>{Array.from({length:n}).map((_,i)=><span key={i} style={{color:C.amber,fontSize:14}}>★</span>)}</div>;
}

function PBtn({ children, onClick, color=C.green, lg, sm, disabled, fullWidth }) {
  const [h,setH]=useState(false);
  const p=lg?"18px 44px":sm?"9px 18px":"13px 26px", fs=lg?17:sm?12:15;
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:disabled?C.ghost:`linear-gradient(135deg,${color},${color===C.green?"#0EA5E9":color})`,color:disabled?C.sub:"#fff",border:"none",borderRadius:11,padding:p,fontSize:fs,fontWeight:800,fontFamily:"'Syne',sans-serif",cursor:disabled?"not-allowed":"pointer",transform:h&&!disabled?"translateY(-2px)":"none",boxShadow:h&&!disabled?`0 8px 28px ${color}35`:"none",transition:"all 0.18s",opacity:disabled?0.45:1,width:fullWidth?"100%":"auto",whiteSpace:"nowrap"}}>{children}</button>;
}

function GBtn({ children, onClick, fullWidth }) {
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:"transparent",border:`1px solid ${h?C.hi:C.border}`,color:h?C.ink:C.sub,borderRadius:11,padding:"12px 22px",fontSize:14,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",transition:"all 0.18s",width:fullWidth?"100%":"auto"}}>{children}</button>;
}

function SectionLabel({ color=C.green, children }) {
  return <div style={{fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",color,fontWeight:700,marginBottom:14,fontFamily:"'DM Mono',monospace"}}>{children}</div>;
}

function Input({ type="text", value, onChange, placeholder, mono, error, onKeyDown }) {
  const [foc,setFoc]=useState(false);
  return <>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${error?"#F87171":foc?C.green+"55":C.border}`,borderRadius:11,padding:"13px 16px",color:C.ink,fontSize:15,fontFamily:mono?"'DM Mono',monospace":"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box",letterSpacing:mono?"0.1em":"normal",transition:"border-color 0.2s"}}/>
    {error&&<div style={{fontSize:12,color:"#F87171",marginTop:5}}>⚠ {error}</div>}
  </>;
}

function FieldLabel({ children }) {
  return <div style={{fontSize:11,color:C.sub,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:8,marginTop:18,fontFamily:"'DM Mono',monospace"}}>{children}</div>;
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
  function pay() {
    err.current="";
    if (!Sec.isEmail(email)) { err.current="Enter a valid email address"; rerender(n=>n+1); return; }
    if (Sec.bad(email)) { err.current="Invalid input"; rerender(n=>n+1); return; }
    loading.current=true; rerender(n=>n+1);
    setTimeout(()=>{ loading.current=false; onSuccess(email); },2000);
  }
  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
        <Chip color={C.green}>🔒 SSL Secured</Chip>
        <Chip color={C.sky}>✓ Paystack</Chip>
      </div>
      <div style={{fontSize:12,color:C.sub,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>Subscribing to</div>
      <div style={{fontSize:24,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:2}}>{plan.name} Plan</div>
      <div style={{fontSize:42,fontWeight:900,color:plan.color,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.04em",lineHeight:1,marginBottom:20}}>
        {plan.price}<span style={{fontSize:15,color:C.sub,fontWeight:400}}>/month</span>
      </div>
      <div style={{height:1,background:C.border,marginBottom:4}} />
      <FieldLabel>Your Email Address</FieldLabel>
      <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@yourbusiness.com" error={err.current} onKeyDown={e=>e.key==="Enter"&&pay()} />
      <div style={{background:"rgba(0,200,150,0.07)",border:`1px solid rgba(0,200,150,0.18)`,borderRadius:12,padding:"13px 16px",margin:"18px 0 22px",fontSize:13,color:C.sub,lineHeight:1.7}}>
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

  function verify() {
    if (!validate()) return;
    setLoading(true);
    setTimeout(()=>{ setLoading(false); setStep(2); },1800);
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
        <div style={{fontSize:14,color:C.sub,marginBottom:4}}>Sending <strong style={{color:C.green}}>₦{balance.toLocaleString()}</strong> to your bank account</div>
        <FieldLabel>Bank Name</FieldLabel>
        <select value={form.bank} onChange={e=>setForm(f=>({...f,bank:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${errs.bank?"#F87171":C.border}`,borderRadius:11,padding:"13px 16px",color:form.bank?C.ink:"rgba(232,238,255,0.25)",fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box"}}>
          <option value="" style={{background:C.s2}}>Select your bank</option>
          {NIGERIAN_BANKS.map(b=><option key={b} value={b} style={{background:C.s2}}>{b}</option>)}
        </select>
        {errs.bank&&<div style={{fontSize:12,color:"#F87171",marginTop:4}}>⚠ {errs.bank}</div>}
        <FieldLabel>Account Number</FieldLabel>
        <Input value={form.account} onChange={e=>setForm(f=>({...f,account:e.target.value.replace(/\D/g,"").slice(0,10)}))} placeholder="10-digit account number" mono error={errs.account}/>
        <FieldLabel>Account Name</FieldLabel>
        <Input value={form.name} onChange={e=>setForm(f=>({...f,name:Sec.sanitize(e.target.value)}))} placeholder="Name on your bank account" error={errs.name}/>
        <div style={{background:"rgba(251,191,36,0.07)",border:`1px solid rgba(251,191,36,0.2)`,borderRadius:12,padding:"13px 16px",margin:"18px 0 22px",fontSize:13,color:C.sub,lineHeight:1.7}}>
          ⚡ Account verified via <strong style={{color:C.amber}}>Paystack Transfer API</strong>. Funds arrive within 24 hours.
        </div>
        <PBtn onClick={verify} disabled={loading} fullWidth lg>{loading?"Verifying account...":"Verify & Continue →"}</PBtn>
        <div style={{marginTop:10}}><GBtn onClick={onClose} fullWidth>Cancel</GBtn></div>
      </>}

      {step===2&&<>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:12}}>✅</div>
          <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:6}}>Account Verified</div>
          <div style={{fontSize:14,color:C.sub}}>Please confirm your details below</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",marginBottom:20}}>
          {[["Bank",form.bank],["Account",Sec.mask(form.account)],["Name",form.name],["Amount",`₦${balance.toLocaleString()}`]].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,color:C.sub}}>{l}</span>
              <span style={{fontSize:14,fontWeight:700,color:l==="Amount"?C.green:C.ink}}>{v}</span>
            </div>
          ))}
        </div>
        <label style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:22,cursor:"pointer"}}>
          <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:3,accentColor:C.green,width:16,height:16,flexShrink:0}}/>
          <span style={{fontSize:13,color:C.sub,lineHeight:1.7}}>I confirm these bank details are correct. AutoFlowNG is not responsible for transfers to incorrect accounts.</span>
        </label>
        <PBtn onClick={confirm} disabled={!agreed} fullWidth lg>Confirm Withdrawal →</PBtn>
        <div style={{marginTop:10}}><GBtn onClick={()=>setStep(1)} fullWidth>← Go Back</GBtn></div>
      </>}

      {step===3&&(
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:56,marginBottom:16,animation:"bounceIn 0.5s ease"}}>🎉</div>
          <div style={{fontSize:22,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:10}}>Withdrawal Submitted!</div>
          <div style={{fontSize:14,color:C.sub,lineHeight:1.8}}>Your <strong style={{color:C.green}}>₦{balance.toLocaleString()}</strong> will arrive within <strong style={{color:C.green}}>24 hours</strong>.</div>
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
  const [region, setRegion] = useState(()=>detectRegion());
  const plans = region === "africa" ? NGN_PLANS : USD_PLANS;
  const isAfrica = region === "africa";
  const px = mobile ? "5%" : tablet ? "6%" : "8%";
  const isSm = mobile || tablet;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:"'DM Sans',sans-serif", overflowX:"hidden" }}>
      <GlobalStyles />
      {payPlan && <PayModal plan={payPlan} onClose={()=>setPayPlan(null)} onSuccess={()=>{ setPayPlan(null); setSuccess(true); setTimeout(()=>{ setSuccess(false); onApp(); },2000); }}/>}
      {success && (
        <div style={{position:"fixed",top:mobile?16:24,right:mobile?16:24,zIndex:999,background:C.s2,border:`1px solid ${C.green}50`,borderRadius:14,padding:"14px 20px",animation:"slideDown 0.3s ease",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",zIndex:2000}}>
          <div style={{color:C.green,fontWeight:800,marginBottom:4}}>✓ Payment Successful!</div>
          <div style={{fontSize:13,color:C.sub}}>Setting up your workspace...</div>
        </div>
      )}

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,backdropFilter:"blur(24px)",background:"rgba(4,6,15,0.88)",borderBottom:`1px solid ${C.border}`,padding:`0 ${px}`,display:"flex",alignItems:"center",justifyContent:"space-between",height:mobile?58:66}}>
        <Logo size={mobile?"sm":"md"} onClick={()=>{}} />
        {/* Desktop nav */}
        {!mobile && (
          <div style={{display:"flex",gap:28,alignItems:"center"}}>
            {["Features","Pricing","Security"].map(l=>(
              <a key={l} href={`#${l.toLowerCase()}`} style={{fontSize:14,color:C.sub,textDecoration:"none",fontWeight:500,transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=C.ink} onMouseLeave={e=>e.target.style.color=C.sub}>{l}</a>
            ))}
            <PBtn onClick={onApp} sm>Get Started</PBtn>
          </div>
        )}
        {/* Mobile hamburger */}
        {mobile && (
          <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:"none",color:C.ink,fontSize:22,cursor:"pointer",padding:8}}>
            {menuOpen?"✕":"☰"}
          </button>
        )}
      </nav>

      {/* Mobile menu */}
      {mobile && menuOpen && (
        <div style={{position:"fixed",top:58,left:0,right:0,zIndex:99,background:C.s1,borderBottom:`1px solid ${C.border}`,padding:"16px 5%",display:"flex",flexDirection:"column",gap:16}}>
          {["Features","Pricing","Security"].map(l=>(
            <a key={l} href={`#${l.toLowerCase()}`} onClick={()=>setMenuOpen(false)} style={{fontSize:16,color:C.sub,textDecoration:"none",fontWeight:600,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>{l}</a>
          ))}
          <PBtn onClick={()=>{ setMenuOpen(false); onApp(); }} lg>Get Started →</PBtn>
        </div>
      )}

      {/* HERO */}
      <section style={{position:"relative",overflow:"hidden",padding:mobile?`80px ${px} 60px`:`110px ${px} 90px`,textAlign:"center"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}><Particles opacity={0.5}/></div>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 65% 55% at 50% 0%, rgba(0,200,150,0.08) 0%, transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1,maxWidth:840,margin:"0 auto"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,200,150,0.1)",border:`1px solid rgba(0,200,150,0.24)`,borderRadius:20,padding:"6px 16px",fontSize:13,color:C.green,marginBottom:28,fontWeight:700}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:C.green,display:"inline-block",animation:"glw 2s ease infinite"}}/>
            AI-Powered Business Automation
          </div>
          <h1 style={{fontSize:mobile?"clamp(34px,9vw,52px)":tablet?"clamp(44px,6vw,62px)":"clamp(52px,5.5vw,80px)",fontWeight:900,lineHeight:1.04,letterSpacing:"-0.045em",margin:"0 0 22px",fontFamily:"'Syne',sans-serif"}}>
            Automate Everything.<br/>
            <span style={{background:`linear-gradient(90deg, ${C.green}, ${C.sky}, ${C.violet})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
              Grow Without Limits.
            </span>
          </h1>
          <p style={{fontSize:mobile?15:18,color:C.sub,maxWidth:540,margin:"0 auto 40px",lineHeight:1.78}}>
            Connect your Gmail, WhatsApp, Instagram, and 7 more platforms. Your AI agent handles messages, follow-ups, content, and leads — every hour of every day.
          </p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <PBtn onClick={onApp} lg>Start 3-Day Free Trial →</PBtn>
          </div>
          <p style={{fontSize:13,color:C.sub,marginTop:14}}>3 days free · Then from {isAfrica?"₦15,000":"$49"}/month · Pay via {isAfrica?"Paystack":"Stripe / Card"}</p>

          {/* Platform logos */}
          <div style={{display:"flex",justifyContent:"center",gap:mobile?10:14,marginTop:mobile?44:60,flexWrap:"wrap",padding:`0 ${mobile?"0":"20px"}`}}>
            {PLATFORMS.map((p,i)=>(
              <div key={p.id} title={p.name} style={{animation:`fy ${3+(i%4)*0.35}s ease-in-out ${i*0.1}s infinite alternate`,transition:"transform 0.2s, box-shadow 0.2s",cursor:"default"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.15)";e.currentTarget.style.boxShadow=`0 0 22px ${p.color}50`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}
              >
                <PlatformTile id={p.id} size={mobile?44:52}/>
              </div>
            ))}
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

      {/* FEATURES */}
      <section id="features" style={{padding:mobile?`40px ${px} 60px`:`60px ${px} 80px`}}>
        <div style={{textAlign:"center",marginBottom:mobile?36:52}}>
          <SectionLabel>FEATURES</SectionLabel>
          <h2 style={{fontSize:mobile?"clamp(26px,7vw,36px)":"clamp(30px,4vw,50px)",fontWeight:900,letterSpacing:"-0.035em",fontFamily:"'Syne',sans-serif",lineHeight:1.1}}>
            Built for businesses that<br/><span style={{color:C.sub}}>refuse to slow down</span>
          </h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"repeat(2,1fr)":"repeat(3,1fr)",gap:14,maxWidth:1100,margin:"0 auto"}}>
          {FEATURES.map(f=>(
            <FeatureCard key={f.title} f={f} mobile={mobile}/>
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
              <div style={{fontSize:12,color:s.c,fontWeight:700,letterSpacing:"0.06em",marginBottom:10,fontFamily:"'DM Mono',monospace"}}>{s.n}</div>
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
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"1fr":"repeat(3,1fr)",gap:14,maxWidth:1100,margin:"0 auto"}}>
          {TESTIMONIALS.map(t=>(
            <TestimonialCard key={t.name} t={t} mobile={mobile}/>
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
          {/* Region Toggle */}
          <div style={{display:"inline-flex",alignItems:"center",gap:0,background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,padding:4,marginBottom:8}}>
            <button onClick={()=>setRegion("africa")} style={{padding:"8px 20px",borderRadius:9,border:"none",background:isAfrica?C.amber:"transparent",color:isAfrica?"#000":C.sub,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}}>🌍 Africa (₦)</button>
            <button onClick={()=>setRegion("western")} style={{padding:"8px 20px",borderRadius:9,border:"none",background:!isAfrica?"#A78BFA":"transparent",color:!isAfrica?"#000":C.sub,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}}>🌎 International ($)</button>
          </div>
          {!isAfrica && <p style={{fontSize:12,color:C.sub,marginTop:4}}>🇺🇸 USA · 🇬🇧 UK · 🇨🇦 Canada · 🇦🇺 Australia · 🇪🇺 Europe</p>}
          {isAfrica && <p style={{fontSize:12,color:C.sub,marginTop:4}}>🇳🇬 Nigeria · 🇬🇭 Ghana · 🇰🇪 Kenya · 🇿🇦 South Africa · 🇺🇬 Uganda · 🇹🇿 Tanzania</p>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":tablet?"1fr":"repeat(3,1fr)",gap:mobile?14:18,maxWidth:1020,margin:"0 auto"}}>
          {plans.map((plan,i)=>(
            <PlanCard key={plan.name} plan={plan} onSelect={()=>setPayPlan(plan)} mobile={mobile}/>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:24}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 20px",fontSize:14,color:C.sub}}>
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
            {icon:"🔐",t:"AES-256 Encryption",d:"All data encrypted in transit and at rest"},
            {icon:"🚦",t:"Rate Limiting",d:"Brute force and bot attacks blocked automatically"},
            {icon:"🧹",t:"Input Sanitization",d:"XSS and SQL injection attacks prevented"},
            {icon:"🪙",t:"CSRF Protection",d:"Every form protected against cross-site attacks"},
            {icon:"👁",t:"AI Fraud Detection",d:"Suspicious activity flagged and blocked in real time"},
            {icon:"🔑",t:"OAuth 2.0 Only",d:"Your platform passwords are never stored by us"},
          ].map(m=>(
            <div key={m.t} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,padding:mobile?"18px":"22px 24px",display:"flex",gap:14,alignItems:"flex-start",transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.green+"35"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
            >
              <div style={{width:38,height:38,borderRadius:10,background:"rgba(0,200,150,0.1)",border:`1px solid rgba(0,200,150,0.18)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{m.icon}</div>
              <div>
                <div style={{fontSize:14,fontWeight:800,marginBottom:4,fontFamily:"'Syne',sans-serif"}}>{m.t}</div>
                <div style={{fontSize:13,color:C.sub,lineHeight:1.6}}>{m.d}</div>
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
        <span style={{fontSize:13,color:C.ghost}}>© 2026 AutoFlowNG · All rights reserved</span>
        <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
          {["Privacy","Terms","Security","Support"].map(l=><span key={l} style={{fontSize:13,color:C.ghost,cursor:"pointer",transition:"color 0.2s"}} onMouseEnter={e=>e.target.style.color=C.sub} onMouseLeave={e=>e.target.style.color=C.ghost}>{l}</span>)}
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
          <div style={{fontSize:14,fontWeight:800}}>{t.name}</div>
          <div style={{fontSize:12,color:C.sub}}>{t.role}</div>
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
      <div style={{fontSize:11,color:C.sub,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>{plan.name}</div>
      <div style={{fontSize:12,color:C.ghost,marginBottom:14}}>{plan.tagline}</div>
      <div style={{fontSize:mobile?36:42,fontWeight:900,color:plan.color,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.04em",lineHeight:1,marginBottom:4}}>
        {plan.price}<span style={{fontSize:14,color:C.sub,fontWeight:400}}>/mo</span>
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
  const [trialState, setTrialState] = useState(() => {
    // In production this would come from your backend/database
    // For demo we simulate: trial started 2.5 days ago (12 hours left)
    const now = Date.now();
    const startedAt = now - (2.5 * 24 * 60 * 60 * 1000); // 2.5 days ago
    const expiresAt = startedAt + (TRIAL_DAYS * 24 * 60 * 60 * 1000);
    return { startedAt, expiresAt, subscribed: false };
  });

  const now = Date.now();
  const msLeft = trialState.expiresAt - now;
  const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60)));
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));
  const isExpired = msLeft <= 0 && !trialState.subscribed;
  const isExpiringSoon = msLeft > 0 && msLeft < 24 * 60 * 60 * 1000; // less than 24h
  const isActive = msLeft > 0;
  const pctLeft = Math.max(0, Math.min(100, (msLeft / (TRIAL_DAYS * 24 * 60 * 60 * 1000)) * 100));

  function subscribe() {
    setTrialState(s => ({ ...s, subscribed: true }));
  }

  return { hoursLeft, minutesLeft, daysLeft, isExpired, isExpiringSoon, isActive, pctLeft, subscribed: trialState.subscribed, subscribe };
}

// Trial countdown banner shown inside the app
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
        {/* Progress bar */}
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

// Full-screen trial expired modal
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
    setPaying(true);
    setTimeout(() => { setPaying(false); setDone(true); setTimeout(onSubscribe, 2000); }, 2500);
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
          {/* Header */}
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

          {/* What you'll lose notice */}
          <div style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.18)", borderRadius: 14, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🔒</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.rose, marginBottom: 4 }}>Your access is paused</div>
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
                All your connected platforms, automations, and AI agent tasks are paused until you subscribe. Your data is safe and will be restored the moment you pick a plan.
              </div>
            </div>
          </div>

          {/* Plans */}
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

          {/* Email + Pay */}
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
// APP DASHBOARD
// ═══════════════════════════════════════════════════════════════
function AppDashboard({ onBack }) {
  const { mobile, tablet } = useBreakpoint();
  const [nav, setNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [platforms, setPlatforms] = useState(PLATFORMS.map(p=>({...p,connected:false})));
  const [connecting, setConnecting] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [refBalance] = useState(4000);
  const isMobile = mobile || tablet;
  const trial = useTrialSystem();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const user = { name:"My Business", plan: trial.subscribed ? "Business" : "Free Trial", code: Sec.code() };

  function toast(msg, color=C.green) {
    const id = Date.now();
    setToasts(t=>[...t,{id,msg,color}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);
  }

  function connectPlatform(id) {
    setConnecting(id);
    setTimeout(()=>{
      setPlatforms(p=>p.map(x=>x.id===id?{...x,connected:!x.connected}:x));
      const pl=platforms.find(p=>p.id===id);
      toast(pl.connected?`${pl.name} disconnected`:`${pl.name} connected! ✓`);
      setConnecting(null);
    },1400);
  }

  const connected = platforms.filter(p=>p.connected);

  const NAV = [
    {id:"dashboard",icon:"◼",label:"Dashboard"},
    {id:"connections",icon:"🔗",label:"Connections"},
    {id:"automations",icon:"⚡",label:"Automations"},
    {id:"agent",icon:"🤖",label:"AI Agent"},
    {id:"knowledge",icon:"🧠",label:"Knowledge Hub"},
    {id:"referrals",icon:"🎁",label:"Referrals",badge:refBalance>0?`₦${refBalance/1000}K`:null},
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
          <button key={n.id} onClick={()=>{ setNav(n.id); if(isMobile)setSidebarOpen(false); }} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:11,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",textAlign:"left",background:nav===n.id?"rgba(0,200,150,0.1)":"transparent",color:nav===n.id?C.green:C.sub,transition:"all 0.15s",position:"relative"}}>
            {nav===n.id&&<div style={{position:"absolute",left:0,top:"22%",bottom:"22%",width:3,borderRadius:2,background:C.green}}/>}
            <span style={{fontSize:15}}>{n.icon}</span>
            <span style={{flex:1}}>{n.label}</span>
            {n.badge&&<span style={{background:C.green,color:"#000",borderRadius:20,padding:"2px 7px",fontSize:10,fontWeight:800}}>{n.badge}</span>}
          </button>
        ))}
      </nav>
      <div style={{padding:"14px 18px",borderTop:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.amber},${C.green})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#000",flexShrink:0}}>{user.name[0]}</div>
          <div style={{overflow:"hidden",flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
            <div style={{fontSize:11,color:trial.subscribed?C.green:trial.isExpiringSoon?C.rose:C.amber}}>
              {trial.subscribed ? "✓ Business Plan" : trial.isExpired ? "⚠ Trial Expired" : `🎁 Trial — ${trial.daysLeft > 0 ? trial.daysLeft+"d" : trial.hoursLeft+"h"} left`}
            </div>
          </div>
        </div>
        {!trial.subscribed && !trial.isExpired && (
          <button onClick={()=>setShowSubscribeModal(true)} style={{marginTop:10,width:"100%",background:trial.isExpiringSoon?C.rose:C.amber,color:"#fff",border:"none",borderRadius:8,padding:"9px 0",fontWeight:800,fontSize:11,fontFamily:"'Syne',sans-serif",cursor:"pointer",letterSpacing:"0.02em"}}>
            {trial.isExpiringSoon?"⚠ Subscribe Now":"Upgrade Plan"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,color:C.ink,fontFamily:"'DM Sans',sans-serif",overflow:"hidden",position:"relative"}}>
      <GlobalStyles/>

      {/* Toasts */}
      <div style={{position:"fixed",top:isMobile?16:20,right:isMobile?16:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8,maxWidth:290}}>
        {toasts.map(t=>(
          <div key={t.id} style={{background:C.s2,border:`1px solid ${t.color}45`,padding:"12px 16px",borderRadius:12,fontSize:13,animation:"slideDown 0.3s ease",boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
            <span style={{color:t.color,marginRight:8}}>●</span>{t.msg}
          </div>
        ))}
      </div>

      {showWithdraw&&<WithdrawModal balance={refBalance} onClose={()=>setShowWithdraw(false)} onDone={()=>toast("Withdrawal submitted! Arrives in 24 hours 🎉")}/>}

      {/* Trial expired modal */}
      {(trial.isExpired || showSubscribeModal) && !trial.subscribed && (
        <TrialExpiredModal
          isMobile={isMobile}
          onSubscribe={() => { trial.subscribe(); setShowSubscribeModal(false); toast("Subscription activated! Full access restored 🎉"); }}
        />
      )}

      {/* Mobile sidebar overlay */}
      {isMobile&&sidebarOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
          <div style={{width:260,background:C.s1,borderRight:`1px solid ${C.border}`,height:"100%",overflow:"hidden"}}><Sidebar/></div>
          <div style={{flex:1,background:"rgba(0,0,0,0.7)"}} onClick={()=>setSidebarOpen(false)}/>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile&&<Sidebar/>}

      {/* Main */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        {/* Top bar */}
        <div style={{padding:isMobile?"14px 16px":"16px 28px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.s1,flexShrink:0,gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {isMobile&&(
              <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:C.ink,fontSize:20,cursor:"pointer",padding:"4px 8px",flexShrink:0}}>☰</button>
            )}
            <div>
              <div style={{fontSize:isMobile?16:19,fontWeight:900,letterSpacing:"-0.025em",fontFamily:"'Syne',sans-serif",lineHeight:1}}>
                {{dashboard:"Dashboard",connections:"Connections",automations:"Automations",agent:"AI Agent",knowledge:"Knowledge Hub",referrals:"Referral Program",security:"Security Center",analytics:"Analytics",billing:"Billing"}[nav]}
              </div>
              {!isMobile&&<div style={{fontSize:12,color:C.sub,marginTop:3}}>Monday, 11 May 2026</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
            <Chip color={C.green} dot>{connected.length} live</Chip>
          </div>
        </div>

        {/* Trial banner */}
        {!trial.subscribed && !trial.isExpired && (
          <TrialBanner
            hoursLeft={trial.hoursLeft}
            minutesLeft={trial.minutesLeft}
            daysLeft={trial.daysLeft}
            isExpiringSoon={trial.isExpiringSoon}
            isExpired={trial.isExpired}
            pctLeft={trial.pctLeft}
            onSubscribe={() => setShowSubscribeModal(true)}
            isMobile={isMobile}
          />
        )}

        {/* Page body */}
        <div style={{flex:1,overflowY:"auto",padding:isMobile?"16px":"28px 32px"}}>

          {/* DASHBOARD */}
          {nav==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:12}}>
                {[
                  {label:"Platforms",value:connected.length,col:C.sky},
                  {label:"Automations",value:"0",col:C.green},
                  {label:"Actions Today",value:"0",col:C.amber},
                  {label:"Referral Balance",value:`₦${refBalance.toLocaleString()}`,col:C.violet},
                ].map(s=>(
                  <div key={s.label} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:isMobile?"16px":"20px 22px"}}>
                    <div style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>{s.label}</div>
                    <div style={{fontSize:isMobile?24:30,fontWeight:900,color:s.col,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.025em",lineHeight:1}}>{s.value}</div>
                  </div>
                ))}
              </div>
              {/* Welcome */}
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

              {/* Trial info card */}
              {!trial.subscribed && (
                <div style={{background:trial.isExpiringSoon?"rgba(251,113,133,0.07)":"rgba(251,191,36,0.06)",border:`1px solid ${trial.isExpiringSoon?"rgba(251,113,133,0.22)":"rgba(251,191,36,0.2)"}`,borderRadius:18,padding:isMobile?"18px":"22px 28px"}}>
                  <div style={{display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",gap:16,flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontSize:isMobile?15:17,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:6,color:trial.isExpiringSoon?C.rose:C.amber}}>
                        {trial.isExpiringSoon?"⚠️ Trial ending soon!":"🎁 Free Trial Active"}
                      </div>
                      <div style={{fontSize:13,color:C.sub,lineHeight:1.7,maxWidth:440}}>
                        {trial.isExpiringSoon
                          ? `Only ${trial.hoursLeft}h ${trial.minutesLeft}m remaining. Subscribe now to keep your automations running without interruption.`
                          : `You have ${trial.daysLeft} day${trial.daysLeft>1?"s":""} of free access to all features. No payment needed until your trial ends.`
                        }
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10,alignItems:isMobile?"flex-start":"flex-end",flexShrink:0}}>
                      {/* Countdown display */}
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
                      <PBtn onClick={()=>setShowSubscribeModal(true)} color={trial.isExpiringSoon?C.rose:C.amber}>Subscribe Now →</PBtn>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{marginTop:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:11,color:C.sub,fontFamily:"'DM Mono',monospace"}}>Trial Progress</span>
                      <span style={{fontSize:11,color:C.sub,fontFamily:"'DM Mono',monospace"}}>{Math.round(100-trial.pctLeft)}% used</span>
                    </div>
                    <div style={{height:6,background:"rgba(255,255,255,0.07)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${100-trial.pctLeft}%`,background:`linear-gradient(90deg,${C.green},${trial.isExpiringSoon?C.rose:C.amber})`,borderRadius:3,transition:"width 1s ease"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                      <span style={{fontSize:11,color:C.sub}}>Day 1</span>
                      <span style={{fontSize:11,color:C.sub}}>Day 3</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Referral */}
              <div style={{background:`linear-gradient(135deg,rgba(251,191,36,0.07),rgba(167,139,250,0.05))`,border:`1px solid rgba(251,191,36,0.2)`,borderRadius:18,padding:isMobile?"18px":"22px 28px",display:"flex",flexDirection:isMobile?"column":"row",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",gap:16}}>
                <div>
                  <div style={{fontSize:isMobile?15:17,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:4}}>🎁 You have ₦{refBalance.toLocaleString()} to withdraw</div>
                  <div style={{fontSize:13,color:C.sub}}>From your referral earnings. Withdraw directly to your bank account.</div>
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
                  <div style={{fontSize:11,color:C.sub,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12,fontFamily:"'DM Mono',monospace"}}>{cat}</div>
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
                    {platforms.filter(p=>p.cat===cat).map(p=>(
                      <div key={p.id} style={{background:C.s1,border:`1px solid ${p.connected?p.color+"55":C.border}`,borderRadius:16,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,transition:"all 0.2s",boxShadow:p.connected?`0 4px 20px ${p.color}15`:"none"}}>
                        <PlatformTile id={p.id} size={46}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:800,fontSize:14,marginBottom:4,fontFamily:"'Syne',sans-serif"}}>{p.name}</div>
                          <div style={{fontSize:12,color:p.connected?C.green:C.sub,display:"flex",alignItems:"center",gap:5}}>
                            {p.connected&&<span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",animation:"glw 2s ease infinite"}}/>}
                            {p.connected?"Connected":"Not connected"}
                          </div>
                        </div>
                        <button onClick={()=>connectPlatform(p.id)} style={{
                          background: p.connected ? "transparent" : PLATFORM_BTN_BG[p.id] || p.color,
                          color: p.connected ? C.sub : PLATFORM_BTN_TEXT[p.id] || "#fff",
                          border: `1.5px solid ${p.connected ? C.border : PLATFORM_BTN_BG[p.id] || p.color}`,
                          borderRadius:10, padding:"9px 18px", fontSize:12, fontWeight:800,
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
                    <div style={{fontSize:14,color:C.sub,maxWidth:400}}>Share your link. Every person who subscribes earns you ₦1,000 — paid to your bank account.</div>
                  </div>
                  <div style={{textAlign:isMobile?"left":"right",flexShrink:0}}>
                    <div style={{fontSize:11,color:C.sub,marginBottom:4,fontFamily:"'DM Mono',monospace"}}>AVAILABLE BALANCE</div>
                    <div style={{fontSize:isMobile?32:40,fontWeight:900,color:C.green,fontFamily:"'Syne',sans-serif",letterSpacing:"-0.03em"}}>₦{refBalance.toLocaleString()}</div>
                    {refBalance>=1000&&<div style={{marginTop:10}}><PBtn onClick={()=>setShowWithdraw(true)}>Withdraw →</PBtn></div>}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:22}}>
                  {[["7","Total Referrals"],["4","Successful"],["₦7,000","Total Earned"]].map(([v,l])=>(
                    <div key={l} style={{background:"rgba(0,0,0,0.2)",borderRadius:12,padding:isMobile?"12px":"14px 16px",textAlign:"center"}}>
                      <div style={{fontSize:isMobile?20:24,fontWeight:900,fontFamily:"'Syne',sans-serif"}}>{v}</div>
                      <div style={{fontSize:11,color:C.sub,marginTop:4}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,color:C.sub,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>Your Referral Code</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:180,background:"rgba(0,0,0,0.3)",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 18px",fontFamily:"'DM Mono',monospace",fontSize:isMobile?16:20,fontWeight:800,color:C.green,letterSpacing:"0.1em"}}>{user.code}</div>
                    <button onClick={()=>navigator.clipboard.writeText(`https://autoflowng.com/ref/${user.code}`).then(()=>toast("Referral link copied! 🔗"))} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,color:C.sub,borderRadius:10,padding:"12px 16px",fontWeight:700,fontSize:13,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",whiteSpace:"nowrap"}}>Copy Link</button>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  <a href={`https://wa.me/?text=${encodeURIComponent("Automate your business with AutoFlowNG! https://autoflowng.com/ref/"+user.code)}`} target="_blank" rel="noopener noreferrer" style={{background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.28)",color:"#25D366",borderRadius:10,padding:"9px 16px",fontWeight:700,fontSize:13,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>
                    <PlatformLogo id="whatsapp" size={16}/>
                    Share on WhatsApp
                  </a>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Automating my business with AutoFlowNG! https://autoflowng.com/ref/"+user.code)}`} target="_blank" rel="noopener noreferrer" style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${C.border}`,color:C.ink,borderRadius:10,padding:"9px 16px",fontWeight:700,fontSize:13,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>
                    <PlatformLogo id="twitter" size={16}/>
                    Share on Twitter
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://autoflowng.com/ref/"+user.code)}`} target="_blank" rel="noopener noreferrer" style={{background:"rgba(24,119,242,0.1)",border:"1px solid rgba(24,119,242,0.28)",color:"#1877F2",borderRadius:10,padding:"9px 16px",fontWeight:700,fontSize:13,textDecoration:"none",display:"flex",alignItems:"center",gap:8}}>
                    <PlatformLogo id="facebook" size={16}/>
                    Share on Facebook
                  </a>
                </div>
              </div>

              {/* History */}
              <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden"}}>
                <div style={{padding:"16px 22px",borderBottom:`1px solid ${C.border}`,fontWeight:800,fontSize:15,fontFamily:"'Syne',sans-serif"}}>Referral History</div>
                {[{n:"Chidi O.",d:"May 8, 2026",s:"paid"},{n:"Amaka N.",d:"May 3, 2026",s:"paid"},{n:"Emeka B.",d:"Apr 28, 2026",s:"paid"},{n:"Ngozi P.",d:"Apr 20, 2026",s:"paid"},{n:"Tunde A.",d:"Apr 15, 2026",s:"pending"}].map((r,i)=>(
                  <div key={i} style={{padding:"14px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(0,200,150,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:C.green,flexShrink:0}}>{r.n[0]}</div>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.n}</div>
                        <div style={{fontSize:11,color:C.sub}}>{r.d}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{fontWeight:800,color:r.s==="paid"?C.green:C.amber,fontSize:14}}>{r.s==="paid"?"+₦1,000":"Pending"}</span>
                      <Chip color={r.s==="paid"?C.green:C.amber}>{r.s==="paid"?"Paid":"Pending"}</Chip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY */}
          {nav==="security"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:`linear-gradient(135deg,rgba(0,200,150,0.06),rgba(56,189,248,0.04))`,border:`1px solid rgba(0,200,150,0.2)`,borderRadius:18,padding:isMobile?"18px":"22px 26px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                <div style={{fontSize:36}}>🛡</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,fontWeight:900,fontFamily:"'Syne',sans-serif",marginBottom:4}}>Your Account is Protected</div>
                  <div style={{fontSize:14,color:C.sub}}>All 6 security layers are active and monitoring your account.</div>
                </div>
                <Chip color={C.green} dot>Protected</Chip>
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
                {[
                  {icon:"🔐",t:"AES-256 Encryption",d:"All your data is encrypted in transit and at rest — unreadable to anyone without authorization.",c:C.green},
                  {icon:"🚦",t:"Rate Limiting",d:"After 5 failed login attempts, your account is temporarily locked and you are notified immediately.",c:C.sky},
                  {icon:"🧹",t:"Input Sanitization",d:"Every form input is cleaned before processing. XSS and SQL injection attacks are blocked automatically.",c:C.amber},
                  {icon:"🪙",t:"CSRF Protection",d:"A unique security token on every form prevents unauthorized actions being made on your account.",c:C.violet},
                  {icon:"👁",t:"AI Fraud Detection",d:"Our AI monitors for unusual login locations, suspicious referral patterns, and abnormal activity in real time.",c:C.rose},
                  {icon:"🔑",t:"OAuth 2.0 Only",d:"We never store your Gmail, Instagram, or WhatsApp passwords. All connections use official OAuth — like Google and Meta.",c:C.green},
                ].map(m=>(
                  <div key={m.t} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,padding:isMobile?"16px":"20px 22px",display:"flex",gap:14,alignItems:"flex-start",transition:"border-color 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=m.c+"35"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
                  >
                    <div style={{width:38,height:38,borderRadius:10,background:m.c+"12",border:`1px solid ${m.c}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{m.icon}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,marginBottom:5,fontFamily:"'Syne',sans-serif"}}>{m.t}</div>
                      <div style={{fontSize:13,color:C.sub,lineHeight:1.65}}>{m.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AUTOMATIONS ── */}
          {nav==="automations"&&(
            <AutomationsPage isMobile={isMobile} connected={connected} onConnect={()=>setNav("connections")} toast={toast}/>
          )}

          {/* ── AI AGENT ── */}
          {nav==="agent"&&(
            <AgentPage isMobile={isMobile} connected={connected} onConnect={()=>setNav("connections")}/>
          )}

          {/* ── KNOWLEDGE HUB ── */}
          {nav==="knowledge"&&(
            <KnowledgePage isMobile={isMobile}/>
          )}

          {/* ── ANALYTICS ── */}
          {nav==="analytics"&&(
            <AnalyticsPage isMobile={isMobile} connected={connected} onConnect={()=>setNav("connections")}/>
          )}

          {/* ── BILLING ── */}
          {nav==="billing"&&(
            <BillingPage isMobile={isMobile} onUpgrade={(plan)=>toast(`Switching to ${plan} plan...`,C.amber)}/>
          )}

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

function AutomationsPage({ isMobile, connected, onConnect, toast }) {
  const [active, setActive] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = TEMPLATES.filter(t =>
    (filter === "All" || t.cat === filter) &&
    (search === "" || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id) {
    if (active.includes(id)) {
      setActive(a => a.filter(x => x !== id));
      toast("Automation paused");
    } else {
      setActive(a => [...a, id]);
      const t = TEMPLATES.find(t => t.id === id);
      toast(`"${t.name}" activated! ⚡`);
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Active count banner */}
      {active.length > 0 && (
        <div style={{ background:`linear-gradient(135deg,rgba(0,200,150,0.07),rgba(14,165,233,0.04))`, border:`1px solid rgba(0,200,150,0.2)`, borderRadius:14, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:C.green, display:"inline-block", animation:"glw 2s ease infinite" }}/>
            <span style={{ fontWeight:700, fontSize:14 }}><strong style={{ color:C.green }}>{active.length}</strong> automation{active.length>1?"s":""} running</span>
          </div>
          <Chip color={C.green} dot>Live</Chip>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search automations..." style={{ flex:1, minWidth:160, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {CATS.slice(0, isMobile ? 4 : CATS.length).map(c => (
            <button key={c} onClick={()=>setFilter(c)} style={{ background:filter===c?C.green:"transparent", color:filter===c?"#000":C.sub, border:`1px solid ${filter===c?C.green:C.border}`, borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:700, fontFamily:"'DM Mono',monospace", cursor:"pointer", transition:"all 0.15s" }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(300px,1fr))", gap:13 }}>
        {filtered.map(t => {
          const isOn = active.includes(t.id);
          return (
            <div key={t.id} style={{ background:C.s1, border:`1px solid ${isOn ? t.color+"50" : C.border}`, borderRadius:16, padding:"20px 22px", transition:"all 0.22s", boxShadow:isOn?`0 6px 28px ${t.color}12`:"none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:t.color+"15", border:`1px solid ${t.color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{t.icon}</div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, fontFamily:"'Syne',sans-serif", lineHeight:1.3, marginBottom:4 }}>{t.name}</div>
                    <Chip color={t.color}>{t.cat}</Chip>
                  </div>
                </div>
                {/* Toggle switch */}
                <div onClick={()=>toggle(t.id)} style={{ width:46, height:26, borderRadius:13, background:isOn?t.color:"rgba(255,255,255,0.1)", position:"relative", cursor:"pointer", transition:"background 0.2s", flexShrink:0, boxShadow:isOn?`0 0 12px ${t.color}60`:"none" }}>
                  <div style={{ position:"absolute", top:3, left:isOn?23:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}/>
                </div>
              </div>
              <p style={{ fontSize:13, color:C.sub, lineHeight:1.65, marginBottom:14 }}>{t.desc}</p>
              {/* Platform logos */}
              <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                {t.platforms.slice(0,5).map(pid => (
                  <div key={pid} title={PLATFORMS.find(p=>p.id===pid)?.name}>
                    <PlatformTile id={pid} size={26}/>
                  </div>
                ))}
                {t.platforms.length > 5 && <span style={{ fontSize:11, color:C.ghost, marginLeft:2 }}>+{t.platforms.length-5}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  const [tasks, setTasks] = useState([
    { id:1, name:"Reply to Instagram DMs", platform:"instagram", status:"done",    done:47, total:47, time:"1h ago" },
    { id:2, name:"Send follow-up emails",  platform:"gmail",     status:"running", done:14, total:30, time:"Now" },
    { id:3, name:"Schedule LinkedIn posts",platform:"linkedin",  status:"queued",  done:0,  total:5,  time:"Pending" },
  ]);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const SUGGESTIONS = [
    "Reply to all unread WhatsApp messages",
    "Schedule my posts for this week",
    "Send payment reminders to unpaid clients",
    "Follow up on all unanswered emails",
  ];

  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setMessages(m => [...m, { role:"user", text:msg }]);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:`You are AutoFlow AI Agent — an intelligent automation assistant for a professional business automation platform. You help business owners automate tasks across Gmail, WhatsApp, Instagram, Twitter, Facebook, LinkedIn, TikTok, Telegram, Slack and Outlook. Respond in a warm, professional, confident tone. Be specific and actionable. Keep responses to 3-5 sentences. When a user describes a task, confirm what you'll do and on which platform. Use emojis naturally.`,
          messages: messages.concat({role:"user",text:msg}).map(m=>({role:m.role,content:m.text})),
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(c=>c.text||"").join("") || "Got it! I'll handle that right away.";
      setMessages(m => [...m, { role:"assistant", text:reply }]);
      // Add a mock task
      const newTask = { id:Date.now(), name:msg.slice(0,40)+(msg.length>40?"...":""), platform:connected[0]?.id||"gmail", status:"running", done:0, total:20, time:"Now" };
      setTasks(t => [newTask, ...t.slice(0,4)]);
    } catch {
      setMessages(m => [...m, { role:"assistant", text:"I had a connection issue. Please try again — I'm ready to help! 💪" }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display:"flex", flexDirection:isMobile?"column":"row", gap:16, height:isMobile?"auto":"calc(100vh - 130px)" }}>
      {/* Chat panel */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.s1, border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden", minHeight:isMobile?400:0 }}>
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${C.green},${C.sky})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🤖</div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, fontFamily:"'Syne',sans-serif" }}>AutoFlow AI Agent</div>
            <div style={{ fontSize:11, color:C.green, display:"flex", alignItems:"center", gap:5 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block", animation:"glw 2s ease infinite" }}/>Online — ready to work</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:12 }}>
          {messages.map((m,i) => (
            <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:"slideDown 0.2s ease" }}>
              <div style={{ maxWidth:"84%", background:m.role==="user"?"rgba(0,200,150,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${m.role==="user"?"rgba(0,200,150,0.25)":C.border}`, borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"11px 15px", fontSize:13, lineHeight:1.65, color:m.role==="user"?C.green:C.ink, whiteSpace:"pre-wrap" }}>
                {m.text}
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

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ padding:"0 16px 12px", display:"flex", flexDirection:"column", gap:6 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={()=>send(s)} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 14px", color:C.sub, fontSize:13, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.green+"40"; e.currentTarget.style.color=C.ink; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}
              >💬 {s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"flex-end", flexShrink:0 }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }}} placeholder="Describe a task for your AI agent..." rows={2} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", resize:"none", outline:"none", lineHeight:1.5 }}
            onFocus={e=>e.target.style.borderColor=C.green+"50"}
            onBlur={e=>e.target.style.borderColor=C.border}
          />
          <button onClick={()=>send()} disabled={!input.trim()||loading} style={{ width:40, height:40, borderRadius:10, background:input.trim()?C.green:"rgba(255,255,255,0.06)", border:"none", color:input.trim()?"#000":C.sub, fontSize:17, cursor:input.trim()?"pointer":"default", flexShrink:0, transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center" }}>↑</button>
        </div>
      </div>

      {/* Tasks panel */}
      <div style={{ width:isMobile?"100%":280, display:"flex", flexDirection:"column", gap:12, flexShrink:0 }}>
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:14, fontFamily:"'Syne',sans-serif" }}>Active Tasks</div>
          {tasks.map(task => {
            const pl = PLATFORMS.find(p=>p.id===task.platform);
            const pct = task.total > 0 ? Math.round((task.done/task.total)*100) : 0;
            const stCol = task.status==="done"?C.green:task.status==="running"?C.sky:C.amber;
            return (
              <div key={task.id} style={{ padding:"13px 18px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
                  <PlatformTile id={task.platform} size={28}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{task.name}</div>
                    <div style={{ fontSize:11, color:C.sub }}>{task.time}</div>
                  </div>
                  <Chip color={stCol}>{task.status}</Chip>
                </div>
                <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:stCol, borderRadius:3, transition:"width 0.6s ease" }}/>
                </div>
                <div style={{ fontSize:11, color:C.sub, marginTop:4 }}>{task.done}/{task.total} completed</div>
              </div>
            );
          })}
        </div>

        {/* Quick stats */}
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:18, padding:"16px 18px", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontWeight:800, fontSize:14, fontFamily:"'Syne',sans-serif" }}>This Week</div>
          {[
            { label:"Tasks Completed", value:"124", color:C.green },
            { label:"Messages Sent",   value:"892", color:C.sky },
            { label:"Leads Captured",  value:"38",  color:C.amber },
            { label:"Hours Saved",     value:"22h", color:C.violet },
          ].map(s=>(
            <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, color:C.sub }}>{s.label}</span>
              <span style={{ fontSize:16, fontWeight:900, color:s.color, fontFamily:"'Syne',sans-serif" }}>{s.value}</span>
            </div>
          ))}
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

  const WEEKLY = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const ACTIONS = [420, 680, 510, 890, 760, 1100, 940];
  const MESSAGES = [80, 140, 110, 200, 170, 230, 190];
  const max = Math.max(...ACTIONS);

  const PLATFORM_STATS = [
    { id:"instagram", name:"Instagram", color:"#E1306C", actions:3204, pct:72 },
    { id:"whatsapp",  name:"WhatsApp",  color:"#25D366", actions:1890, pct:54 },
    { id:"gmail",     name:"Gmail",     color:"#EA4335", actions:1284, pct:38 },
    { id:"twitter",   name:"Twitter/X", color:"#000000", actions:892,  pct:26 },
    { id:"linkedin",  name:"LinkedIn",  color:"#0A66C2", actions:440,  pct:14 },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:13, color:C.sub }}>Your automation performance at a glance</div>
        <div style={{ display:"flex", gap:6 }}>
          {["7d","30d","90d"].map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{ background:range===r?C.green:"transparent", color:range===r?"#000":C.sub, border:`1px solid ${range===r?C.green:C.border}`, borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, fontFamily:"'DM Mono',monospace", cursor:"pointer", transition:"all 0.15s" }}>{r}</button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Actions Executed", value:"5,959",  delta:"+18%", color:C.green },
          { label:"Messages Sent",    value:"1,120",  delta:"+12%", color:C.sky },
          { label:"Leads Captured",   value:"247",    delta:"+34%", color:C.amber },
          { label:"Avg Response Time",value:"4 sec",  delta:"-96%", color:C.violet },
        ].map(k=>(
          <div key={k.label} style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:isMobile?"14px":"18px 20px" }}>
            <div style={{ fontSize:10, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>{k.label}</div>
            <div style={{ fontSize:isMobile?22:28, fontWeight:900, color:k.color, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em", lineHeight:1, marginBottom:6 }}>{k.value}</div>
            <div style={{ fontSize:12, color:C.green, fontWeight:700 }}>{k.delta} vs last period</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?"16px":"22px 24px" }}>
        <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:4 }}>Daily Actions</div>
        <div style={{ fontSize:13, color:C.sub, marginBottom:20 }}>Number of automated actions executed per day</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:isMobile?8:14, height:140 }}>
          {WEEKLY.map((day,i)=>(
            <div key={day} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{ fontSize:11, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{ACTIONS[i].toLocaleString()}</div>
              <div style={{ width:"100%", borderRadius:"6px 6px 0 0", background:`linear-gradient(180deg,${C.green},${C.sky})`, height:`${Math.round((ACTIONS[i]/max)*100)}px`, minHeight:8, transition:"height 0.6s ease" }}/>
              <div style={{ fontSize:11, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform breakdown */}
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)", gap:14 }}>
        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?"16px":"20px 22px" }}>
          <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:18 }}>Platform Activity</div>
          {PLATFORM_STATS.map(p=>(
            <div key={p.id} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <PlatformTile id={p.id} size={28}/>
                  <span style={{ fontSize:13, fontWeight:700 }}>{p.name}</span>
                </div>
                <span style={{ fontSize:13, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{p.actions.toLocaleString()} actions</span>
              </div>
              <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${p.pct}%`, background:p.color, borderRadius:3, transition:"width 0.8s ease" }}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?"16px":"20px 22px" }}>
          <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif", marginBottom:18 }}>Top Performing Automations</div>
          {[
            { name:"Auto-Reply DMs",     runs:1284, rate:"97%", color:C.rose },
            { name:"Lead Capture",       runs:892,  rate:"94%", color:C.green },
            { name:"Email Sequence",     runs:640,  rate:"88%", color:C.violet },
            { name:"Content Scheduler",  runs:580,  rate:"100%",color:C.sky },
            { name:"Payment Follow-Up",  runs:340,  rate:"91%", color:C.amber },
          ].map((a,i)=>(
            <div key={a.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700 }}>{a.name}</div>
                <div style={{ fontSize:11, color:C.sub }}>{a.runs.toLocaleString()} runs</div>
              </div>
              <Chip color={a.color}>{a.rate} success</Chip>
            </div>
          ))}
        </div>
      </div>

      {/* Time saved */}
      <div style={{ background:`linear-gradient(135deg,rgba(0,200,150,0.07),rgba(56,189,248,0.04))`, border:`1px solid rgba(0,200,150,0.2)`, borderRadius:16, padding:isMobile?"18px":"22px 28px", display:"flex", flexDirection:isMobile?"column":"row", justifyContent:"space-between", alignItems:isMobile?"flex-start":"center", gap:16 }}>
        <div>
          <div style={{ fontSize:isMobile?20:24, fontWeight:900, fontFamily:"'Syne',sans-serif", marginBottom:6 }}>⏱ 38 hours saved this week</div>
          <div style={{ fontSize:14, color:C.sub, maxWidth:420 }}>AutoFlowNG has executed 5,959 actions that you would have done manually. At 4 minutes per action, that's 38 hours saved — every week.</div>
        </div>
        <div style={{ textAlign:isMobile?"left":"right", flexShrink:0 }}>
          <div style={{ fontSize:11, color:C.sub, marginBottom:4, fontFamily:"'DM Mono',monospace" }}>EQUIVALENT VALUE</div>
          <div style={{ fontSize:34, fontWeight:900, color:C.green, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.03em" }}>₦190,000</div>
          <div style={{ fontSize:12, color:C.sub }}>in saved labour costs</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BILLING PAGE
// ═══════════════════════════════════════════════════════════════
const BILLING_PLANS = detectRegion() === "africa" ? [
  { name:"Starter",    price:"₦15,000", amount:15000, currency:"NGN", color:C.sky,    features:["3 platforms","5 automations","1,000 actions/mo","Email support"] },
  { name:"Business",   price:"₦30,000", amount:30000, currency:"NGN", color:C.green,  features:["All platforms","Unlimited automations","50,000 actions/mo","AI agent","Priority support","5 team members"] },
  { name:"Enterprise", price:"₦50,000", amount:50000, currency:"NGN", color:C.amber,  features:["Everything in Business","Unlimited actions","Custom workflows","Dedicated manager","API access","White-label"] },
] : [
  { name:"Starter",    price:"$49",  amount:4900,  currency:"USD", color:C.sky,    features:["3 platforms","5 automations","1,000 actions/mo","Email support"] },
  { name:"Business",   price:"$149", amount:14900, currency:"USD", color:C.green,  features:["All platforms","Unlimited automations","50,000 actions/mo","AI agent","Priority support","5 team members"] },
  { name:"Enterprise", price:"$299", amount:29900, currency:"USD", color:C.amber,  features:["Everything in Business","Unlimited actions","Custom workflows","Dedicated manager","API access","White-label"] },
];

function BillingPage({ isMobile, onUpgrade }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const currentPlan = "Business";
  const nextBilling = "June 10, 2026";
  const usedActions = 28450;
  const totalActions = 50000;
  const usedPct = Math.round((usedActions/totalActions)*100);

  const HISTORY = [
    { date:"May 10, 2026",  plan:"Business", amount: detectRegion()==="africa"?"₦30,000":"$149", status:"Paid", ref:"AFN-2026-0510" },
    { date:"Apr 10, 2026",  plan:"Business", amount: detectRegion()==="africa"?"₦30,000":"$149", status:"Paid", ref:"AFN-2026-0410" },
    { date:"Mar 10, 2026",  plan:"Business", amount: detectRegion()==="africa"?"₦30,000":"$149", status:"Paid", ref:"AFN-2026-0310" },
    { date:"Feb 10, 2026",  plan:"Starter",  amount: detectRegion()==="africa"?"₦15,000":"$49",  status:"Paid", ref:"AFN-2026-0210" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Current plan */}
      <div style={{ background:`linear-gradient(135deg,rgba(0,200,150,0.08),rgba(14,165,233,0.05))`, border:`1px solid rgba(0,200,150,0.22)`, borderRadius:18, padding:isMobile?"20px":"26px 28px" }}>
        <div style={{ display:"flex", flexDirection:isMobile?"column":"row", justifyContent:"space-between", alignItems:isMobile?"flex-start":"center", gap:16, marginBottom:22 }}>
          <div>
            <div style={{ fontSize:11, color:C.sub, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6, fontFamily:"'DM Mono',monospace" }}>Current Plan</div>
            <div style={{ fontSize:isMobile?24:28, fontWeight:900, fontFamily:"'Syne',sans-serif", marginBottom:4 }}>{currentPlan} Plan</div>
            <div style={{ fontSize:14, color:C.sub }}>Next billing: <strong style={{ color:C.ink }}>{nextBilling}</strong> · <strong style={{ color:C.green }}>{detectRegion()==="africa"?"₦30,000":"$149"}</strong></div>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Chip color={C.green} dot>Active</Chip>
            <button onClick={()=>setShowUpgrade(!showUpgrade)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:9, padding:"8px 16px", fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.hi; e.currentTarget.style.color=C.ink; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}
            >{showUpgrade?"Hide Plans":"Change Plan"}</button>
          </div>
        </div>

        {/* Usage */}
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:12 }}>
          {[
            { label:"Actions Used", value:`${usedActions.toLocaleString()} / ${totalActions.toLocaleString()}`, pct:usedPct, color:usedPct>80?C.rose:C.green },
            { label:"Platforms Connected", value:"0 / All", pct:0, color:C.sky },
            { label:"Team Members", value:"1 / 5", pct:20, color:C.violet },
          ].map(u=>(
            <div key={u.label} style={{ background:"rgba(0,0,0,0.2)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontSize:11, color:C.sub, marginBottom:6, fontFamily:"'DM Mono',monospace" }}>{u.label}</div>
              <div style={{ fontSize:14, fontWeight:800, marginBottom:8 }}>{u.value}</div>
              <div style={{ height:5, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${u.pct}%`, background:u.color, borderRadius:3 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan upgrade cards */}
      {showUpgrade && (
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)", gap:14, animation:"slideDown 0.3s ease" }}>
          {BILLING_PLANS.map(plan=>(
            <div key={plan.name} style={{ background:plan.name===currentPlan?`linear-gradient(135deg,${plan.color}10,transparent)`:C.s1, border:`1.5px solid ${plan.name===currentPlan?plan.color+"55":C.border}`, borderRadius:18, padding:"22px 20px", position:"relative", transition:"transform 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="none"}
            >
              {plan.name===currentPlan&&<div style={{ position:"absolute", top:14, right:14 }}><Chip color={plan.color}>Current</Chip></div>}
              <div style={{ fontSize:11, color:C.sub, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6, fontFamily:"'DM Mono',monospace" }}>{plan.name}</div>
              <div style={{ fontSize:34, fontWeight:900, color:plan.color, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.035em", marginBottom:16 }}>{plan.price}<span style={{ fontSize:13, color:C.sub, fontWeight:400 }}>/mo</span></div>
              <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                {plan.features.map(f=><li key={f} style={{ display:"flex", gap:8, fontSize:13, color:"rgba(232,238,255,0.7)" }}><span style={{ color:plan.color }}>✓</span>{f}</li>)}
              </ul>
              <button onClick={()=>plan.name!==currentPlan&&onUpgrade(plan.name)} style={{
                width:"100%",
                background: plan.name===currentPlan ? "transparent" : `linear-gradient(135deg,${plan.color},${plan.color}cc)`,
                color: plan.name===currentPlan ? plan.color : "#fff",
                border:`1.5px solid ${plan.color}`,
                borderRadius:10, padding:"12px 0", fontWeight:800, fontSize:14,
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

      {/* Paystack info */}
      <div style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <div style={{ fontSize:24 }}>🔒</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Payments powered by Paystack</div>
          <div style={{ fontSize:13, color:C.sub }}>{detectRegion()==="africa"?"Pay with your debit card, bank transfer, or USSD via Paystack — fully secure, no dollar card needed.":"Pay with Visa, Mastercard, or American Express via Stripe — fully secure."} Auto-renews monthly.</div>
        </div>
        <button style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>Update Payment</button>
      </div>

      {/* Invoice history */}
      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
        <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>Payment History</div>
        {HISTORY.map((h,i)=>(
          <div key={i} style={{ padding:isMobile?"13px 16px":"14px 22px", borderBottom:i<HISTORY.length-1?`1px solid ${C.border}`:"none", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:isMobile?"wrap":"nowrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"rgba(0,200,150,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>🧾</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{h.plan} Plan — {h.amount}</div>
                <div style={{ fontSize:12, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{h.ref}</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <span style={{ fontSize:13, color:C.sub }}>{h.date}</span>
              <Chip color={C.green}>{h.status}</Chip>
              <button style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.sub, borderRadius:7, padding:"5px 10px", fontSize:11, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>PDF</button>
            </div>
          </div>
        ))}
      </div>

      {/* Cancel */}
      <div style={{ background:"rgba(251,113,133,0.04)", border:`1px solid rgba(251,113,133,0.15)`, borderRadius:14, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:C.rose, marginBottom:4 }}>Cancel Subscription</div>
          <div style={{ fontSize:13, color:C.sub }}>You can cancel anytime. Your account stays active until the end of your billing period.</div>
        </div>
        <button style={{ background:"transparent", border:`1px solid ${C.rose}40`, color:C.rose, borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>Cancel Plan</button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// AI KNOWLEDGE ASSISTANT PAGE — GLOBAL EDITION
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// AI KNOWLEDGE ASSISTANT PAGE — GLOBAL EDITION
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
  { id:"realestate",   icon:"🏠", label:"Real Estate",           color:"#38BDF8" },
  { id:"business_ng",  icon:"🇳🇬", label:"Business Nigeria",      color:"#00C896" },
  { id:"africa_biz",   icon:"🌍", label:"African Business",       color:"#FBBF24" },
  { id:"western_biz",  icon:"🌎", label:"Western Business",       color:"#A78BFA" },
  { id:"eastern_biz",  icon:"🌏", label:"Eastern Business",       color:"#FB7185" },
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

function buildSystemPrompt(langCode, langLabel) {
  const langInstruction = langCode === "en"
    ? "Always respond in English."
    : `IMPORTANT: You MUST respond entirely in ${langLabel}. Every word of your response must be in ${langLabel}. Do not mix languages. If the user writes in any language, always respond in ${langLabel}.`;

  return `You are AutoFlow Knowledge Assistant — a world-class AI expert, business advisor, real estate consultant, educator, and knowledge companion built into the AutoFlowNG platform. You serve entrepreneurs, students, teachers, engineers, real estate professionals, and business owners across Nigeria, Africa, and the entire world.

${langInstruction}

You have deep expertise in ALL of the following areas:

═══ REAL ESTATE — ALL 36 NIGERIAN STATES + FCT ═══
You have comprehensive knowledge of property markets, land prices, investment opportunities, and real estate regulations in every Nigerian state:

SOUTH WEST:
- Lagos: Lekki (Phase 1, Phase 2, Chevron), Victoria Island, Ikoyi, Ajah, Sangotedo, Badore, Epe, Ibeju-Lekki (Free Trade Zone corridor), Magodo, Gbagada, Yaba, Surulere, Ikeja GRA, Maryland, Ojodu Berger. Land prices: Ikoyi ₦500M-₦2B/plot, VI ₦200M-₦800M, Lekki Phase 1 ₦80M-₦300M, Ajah ₦15M-₦50M, Ibeju-Lekki ₦3M-₦20M, Epe ₦1M-₦8M
- Ogun: Abeokuta (Oke-Mosan, Iberekodo), Sagamu, Ijebu-Ode, Mowe-Ofada, Arepo, Magboro (Lagos commuter belt - cheaper land). Prices: ₦500K-₦10M depending on area
- Oyo: Ibadan (Oluyole, Bodija, GRA, Jericho, Akobo, Challenge, Ring Road, Challenge), prices ₦5M-₦80M for commercial; Ogbomosho
- Ondo: Akure (GRA, Oda Road), Owo, Okitipupa. Prices ₦1M-₦15M
- Ekiti: Ado-Ekiti (Federal Secretariat area, GRA), Ikere. Prices ₦500K-₦8M
- Osun: Osogbo (GRA, Dada Estate), Ile-Ife, Ilesa. Prices ₦800K-₦10M

SOUTH SOUTH:
- Rivers: Port Harcourt (GRA Phase 1&2, Peter Odili Road, Rumuola, Rumuibekwe, Eliozu, Woji, Rumuola, Ozuoba, Choba), Trans Amadi (industrial). Prices: GRA ₦50M-₦500M, Eliozu ₦10M-₦50M
- Delta: Asaba (GRA, Okpanam Road, Cable Point), Warri (GRA, Effurun, Ekpan). Prices ₦5M-₦80M
- Edo: Benin City (GRA, Sapele Road, Ugbowo, New Benin, Oba Market area, Airport Road). Prices ₦3M-₦60M
- Bayelsa: Yenagoa (Opolo, Kpansia, Azikoro). Prices ₦2M-₦20M
- Akwa Ibom: Uyo (Ewet Housing, Wellington Bassey Way, Eket). Prices ₦2M-₦25M
- Cross River: Calabar (State Housing, Diamond Hill, Satellite Town, 8 Miles). Prices ₦2M-₦30M

SOUTH EAST:
- Anambra: Awka (Amawbia, Ifite, Udoka Estate), Onitsha (GRA, Fegge, Woliwo), Nnewi. Prices ₦3M-₦60M
- Imo: Owerri (GRA, New Owerri, World Bank Estate, Ikenegbu, Ikeja). Prices ₦5M-₦80M
- Enugu: Enugu (GRA, Independence Layout, Trans Ekulu, New Haven, Abakpa). Prices ₦5M-₦100M
- Abia: Umuahia (GRA, Umuola), Aba (Ogbor Hill, Abayi). Prices ₦2M-₦30M
- Ebonyi: Abakaliki (Mile 50, Housing Estate). Prices ₦500K-₦10M

NORTH CENTRAL (Middle Belt):
- FCT Abuja: Maitama ₦200M-₦2B, Asokoro ₦150M-₦1B, Wuse 2 ₦100M-₦500M, Garki ₦80M-₦300M, Gwarinpa ₦20M-₦80M, Kado ₦30M-₦100M, Jabi ₦40M-₦120M, Life Camp ₦25M-₦80M, Katampe ₦15M-₦60M, Lugbe ₦5M-₦25M, Airport Road ₦3M-₦15M, Karshi ₦1M-₦8M, Kuje ₦800K-₦5M
- Kogi: Lokoja (GRA, Ganaja), Ankpa. Prices ₦500K-₦8M
- Benue: Makurdi (High Level, North Bank, Wadata). Prices ₦500K-₦10M
- Niger: Minna (Maitumbi, Bosso, Tunga). Prices ₦1M-₦15M
- Kwara: Ilorin (GRA, Tanke, Fate Road, Gaa Akanbi). Prices ₦2M-₦20M
- Nasarawa: Lafia (GRA), Keffi (gateway to Abuja — very popular). Keffi ₦1M-₦10M
- Plateau: Jos (GRA, Rayfield, Terminus). Prices ₦2M-₦20M

NORTH WEST:
- Kano: Kano (GRA, Nasarawa, Fagge, Bompai industrial). Prices ₦5M-₦100M
- Kaduna: Kaduna (GRA, Malali, Ungwan Rimi, Barnawa). Prices ₦3M-₦60M
- Sokoto: Sokoto (GRA, Gawon Nama). Prices ₦1M-₦12M
- Zamfara: Gusau. Prices ₦500K-₦5M
- Kebbi: Birnin Kebbi. Prices ₦500K-₦5M
- Katsina: Katsina (GRA, Kofar Kaura). Prices ₦1M-₦10M
- Jigawa: Dutse (GRA). Prices ₦500K-₦5M

NORTH EAST:
- Adamawa: Yola (Doubeli, Karewa, Luggere). Prices ₦1M-₦10M
- Borno: Maiduguri (GRA, Bulumkutu). Prices ₦1M-₦15M
- Gombe: Gombe (GRA, Tudun Wada). Prices ₦800K-₦8M
- Taraba: Jalingo. Prices ₦500K-₦5M
- Yobe: Damaturu. Prices ₦500K-₦5M
- Bauchi: Bauchi (GRA, Wunti). Prices ₦800K-₦8M

PROPERTY SEARCH PLATFORMS IN NIGERIA (you can guide users to search these):
- PropertyPro.ng (propertypro.ng) — largest listings database
- Nigeria Property Centre (nigeriapropertycentre.com) — buy/rent/sell
- Private Property Nigeria (privateproperty.com.ng)
- Jumia House / Lamudi Nigeria
- ToLet.com.ng — rental focus
- Jiji.ng — classified ads including land
- Relocate.ng — international buyers

PROPERTY DOCUMENTS in Nigeria:
- Certificate of Occupancy (C of O) — strongest title, issued by state government
- Right of Occupancy (R of O) — for rural/non-urban land
- Deed of Assignment — transfer of ownership
- Deed of Conveyance — older title document
- Governor's Consent — required when C of O land is transferred
- Survey Plan — from licensed surveyor
- Building Approval / Development Permit — from town planning
- Excision — gazette confirming land is released from government acquisition
- Global C of O — Lagos community-wide title

When users ask to search for land/property, guide them step by step on how to use PropertyPro.ng and other platforms, what filters to use, how to verify listings, and what documents to request from sellers.

REAL ESTATE INVESTMENT STRATEGIES:
- Buy and hold for capital appreciation (best: Ibeju-Lekki, Keffi, Lugbe Abuja, Satellite towns)
- Rental income (best: university towns — Ile-Ife, Nsukka, Zaria, Jos)
- Commercial real estate (shops, warehouses, office space)
- Real Estate Investment Trusts (REITs) — UPDC REIT, Skye Shelter Fund on NGX
- Real estate crowdfunding (Risevest, Coreum, Spleet)
- Short-let/Airbnb (Lagos Island, Abuja, Port Harcourt GRA)
- Off-plan buying — buying before completion at lower prices
- Land banking — buying undeveloped land in growth corridors

AFRICAN REAL ESTATE:
- Ghana: Accra (East Legon, Cantonments, Airport Residential, Tema, Adenta), Kumasi. GHS prices. Land registration at Lands Commission
- Kenya: Nairobi (Karen, Westlands, Kilimani, Eastlands, Ruaka, Thika Road), Mombasa. KES prices
- South Africa: Johannesburg (Sandton, Rosebank, Midrand), Cape Town (Atlantic Seaboard, Southern Suburbs), Durban. ZAR prices. Title Deeds Act
- Egypt: Cairo (New Administrative Capital, Maadi, Heliopolis, New Cairo, 6th of October City)
- Rwanda: Kigali (Kiyovu, Remera, Kimironko)

═══ NIGERIAN BUSINESS — ALL SECTORS ═══
- Registration: CAC (Corporate Affairs Commission) — Business Name ₦10,000-₦25,000, Private Limited Company ₦50,000+, Public Company ₦1M+. Process: name search → reservation → incorporation → post-incorporation
- Taxation: FIRS (Federal Inland Revenue Service), VAIDS, Companies Income Tax (CIT) 30%, Small Company CIT 0% (turnover <₦25M), Medium 20% (₦25M-₦100M), VAT 7.5%, PAYE, Withholding Tax 5-10%, Capital Gains Tax 10%
- State-specific: LIRS (Lagos), Rivers State IRS, Kano IRS
- Business funding: Tony Elumelu Foundation (TEF) $5,000 grants, BOI (Bank of Industry) loans, NIRSAL Microfinance Bank, YouWIN Connect, CBN MSME fund, SMEDAN, NEXIM (export financing), Lagos State Employment Trust Fund (LSETF), Anambra Small Business Agency
- Industry sectors: Fintech (Nigeria is #1 in Africa for funding), AgriTech, HealthTech, EdTech, Logistics, Fashion/Textiles, Entertainment (Nollywood $1B+ industry, music streaming), Food & Beverages, Oil & Gas downstream, Solid Minerals, Real Estate, Construction, Retail, FMCG
- Key markets: Computer Village Ikeja (tech), Alaba International (electronics), Aba (fashion/clothing manufacturing), Onitsha Main Market (largest market in Africa by volume), Kano Kurmi Market, Idumota Lagos (pharmaceuticals/cosmetics)
- Export opportunities: Sesame seeds, cashew, cocoa, shea butter, leather goods, Nollywood content, Afrobeats music, fashion (Ankara), solid minerals (limestone, bitumen, coal, zinc, lead)

═══ AFRICAN BUSINESS ═══
East Africa:
- Kenya: M-Pesa (mobile money), Nairobi Securities Exchange, Silicon Savannah (iHub, Andela Kenya), key sectors (tea, horticulture, tourism, fintech, logistics), Business Registration at eBRS portal
- Tanzania: Dar es Salaam business hub, tourism (Zanzibar, Serengeti), mining (gold, diamonds), Tanzania Investment Centre (TIC)
- Uganda: Kampala, coffee export, Bank of Uganda, Uganda Investment Authority (UIA), fintech growing (MTN MoMo dominant)
- Ethiopia: Addis Ababa, Ethiopian Airlines (most profitable in Africa), coffee (birthplace), textiles, Chinese manufacturing FDI, Ethiopian Investment Commission
- Rwanda: Kigali Innovation City, ease of doing business rank #2 in Africa, RDB (Rwanda Development Board), gorilla tourism, tech hub

West Africa:
- Ghana: Ghana Investment Promotion Centre (GIPC), cocoa #2 world producer, gold (GoldBod), oil (Jubilee Field), Black Star Gate fintech, BRELA business registration, GHS cedi
- Senegal: Dakar, fishing, phosphates, oil discovery, APIX investment agency, CFA franc
- Côte d'Ivoire: Abidjan financial capital of Francophone Africa, cocoa #1 world producer, CFA franc, CEPICI investment
- Cameroon: Douala port city, oil, cocoa, timber, bilingual economy (French/English)
- Benin Republic: Trade hub between Nigeria and Francophone Africa, Cotonou port
- Togo: Lomé, free trade zone, phosphates

Southern Africa:
- South Africa: JSE (largest exchange in Africa), mining (gold Witwatersrand, platinum Bushveld), financial services (Standard Bank, FirstRand, Absa), CIPC business registration, SARS taxes, BEE (Black Economic Empowerment)
- Zimbabwe: Harare, tobacco, platinum, Victoria Falls tourism, multi-currency economy (USD dominant)
- Zambia: Lusaka, copper belt mining, agriculture, ZIDA (Zambia Investment and Development Agency)
- Mozambique: Maputo, natural gas (Rovuma Basin LNG), tourism, TDM

North Africa:
- Egypt: Cairo New Capital, Suez Canal ($9B annual revenue), tourism (Pyramids), natural gas, petroleum, GAFI investment authority, EGP pound
- Morocco: Casablanca financial hub, automotive manufacturing (Renault, Stellantis), phosphates (#1 world reserves), Casablanca Finance City, phosphates
- Tunisia: Tunis, phosphates, tourism, olive oil, FIPA investment
- Algeria: Algiers, natural gas (#1 in Africa), Sonatrach, ANDI investment agency

Pan-African Frameworks:
- AfCFTA (African Continental Free Trade Area): 54 countries, largest free trade zone by countries, tariff elimination, NTB removal, protocols on trade in services and investment
- ECOWAS: 15 West African countries, ECOWAS Trade Liberalisation Scheme (ETLS), free movement of persons
- EAC (East African Community): 7 countries, common market, customs union
- SADC: 16 Southern African countries
- AU Agenda 2063: Continental development blueprint
- African Development Bank (AfDB): Abidjan HQ, project financing

═══ WESTERN BUSINESS ═══
United States:
- Business formation: LLC (most popular for small biz), S-Corporation (pass-through tax, max 100 shareholders), C-Corporation (for venture capital/IPO), Sole Proprietorship, Partnership
- States to incorporate: Delaware (most popular — Delaware Court of Chancery, business-friendly laws), Wyoming (cheap, privacy), Nevada (no state income tax), your home state
- Federal taxes: Corporate tax 21%, Individual income tax 10-37%, Self-employment tax 15.3%, Capital gains tax 0-20%, Estate tax
- IRS: EIN (Employer Identification Number), Form W-2, 1099, quarterly estimated taxes, Section 179 deductions
- Key markets: Silicon Valley (tech), Wall Street/NYC (finance), Los Angeles (entertainment), Houston (energy), Chicago (commodities/futures), Miami (Latin America gateway)
- SBA (Small Business Administration): loans up to $5M, SBDC (counselling), 8(a) program for minority businesses, HUBZone
- Stock markets: NYSE, NASDAQ, OTC Markets
- Visas for business: E-2 Treaty Investor Visa, EB-5 Immigrant Investor, O-1 (extraordinary ability), L-1 (intracompany transfer)

United Kingdom:
- Companies House registration: Private Limited (Ltd), Public Limited Company (PLC), LLP, Sole Trader
- HMRC taxes: Corporation Tax 25% (profits >£250,000), 19% (profits <£50,000), VAT 20% (register when turnover >£90,000), Income Tax 20-45%, National Insurance
- Key sectors: Financial services (City of London, Canary Wharf), Pharmaceuticals (AstraZeneca, GSK), Defence, Creative industries, Tech (Tech City/Silicon Roundabout London)
- Funding: Innovate UK grants, British Business Bank, Angel Investment Network, UK SEIS/EIS tax relief schemes for investors
- Post-Brexit: UK Global Tariff, new customs procedures, UK GDPR

European Union:
- EU Single Market: free movement of goods, services, capital, people across 27 countries
- VAT: varies by country (Germany 19%, France 20%, Hungary 27%), intra-EU VAT rules, OSS scheme
- GDPR: applies to any business handling EU citizen data worldwide, DPA appointment, lawful basis for processing, €20M or 4% global turnover fine
- Key economies: Germany (engineering, automotive — BMW, Mercedes, Volkswagen, Siemens), France (luxury goods — LVMH, L'Oréal, Airbus), Netherlands (logistics hub — Schiphol, Rotterdam port), Spain (tourism, renewables), Italy (fashion — Prada, Gucci, luxury manufacturing)
- Eurozone: 20 countries use Euro, ECB monetary policy
- Business in EU as African: EU-Africa Business Forum, ACP-EU partnership

Middle East:
- UAE: Dubai (DIFC financial centre, Dubai Internet City, free zones — 100% foreign ownership allowed), Abu Dhabi (ADGM), Sharjah. No income tax, VAT 5%. Key for African businesses looking for global presence
- Saudi Arabia: Vision 2030 (MBS reforms), NEOM project, oil (Saudi Aramco #1 company globally by profit), halal economy, SAGIA (investment authority)
- Qatar: Doha, natural gas (LNG exporter), Qatar Investment Authority (sovereign wealth fund), QFC (financial centre)

═══ EASTERN BUSINESS ═══
China:
- World's #2 economy, manufacturing powerhouse (world's factory)
- Key cities: Shanghai (financial), Shenzhen (tech/electronics), Guangzhou (Canton Fair, wholesale), Beijing (politics/tech)
- Canton Fair (China Import and Export Fair): largest trade fair in the world, Guangzhou, held twice yearly
- Alibaba (B2B wholesale), Aliexpress, 1688.com, Made-in-China.com — sourcing platforms
- How to import from China: find supplier (Alibaba), negotiate MOQ and price, quality control, Incoterms (FOB Guangzhou/Shenzhen), freight forwarder, customs clearance in Nigeria, HS codes, import duties
- Chinese investment in Africa: Belt and Road Initiative (BRI), infrastructure (roads, railways, ports, stadiums), Chinese companies in Nigeria (CCECC, CGCOC, Sinohydro)
- WeChat Pay, Alipay — mobile payment giants
- Manufacturing: electronics (Foxconn), textiles, furniture, machinery

India:
- World's fastest growing major economy, #5 largest
- Key sectors: IT/software (Infosys, TCS, Wipro, HCL), pharmaceuticals (generics — Nigeria's largest medicine source), textiles, agriculture
- Mumbai (financial hub, Bollywood), Bangalore (Silicon Valley of India, IT hub), Delhi (political/commercial), Chennai (manufacturing)
- Trade with Nigeria: India is Nigeria's largest trading partner for imports (pharmaceuticals, machinery, vehicles)
- Business registration: MCA portal (Ministry of Corporate Affairs), GST (18%), startup India program
- Sourcing from India: IndiaMart.com, TradeIndia.com — wholesale platforms

Japan:
- #4 world economy, technology innovation leader
- Key companies: Toyota, Honda, Sony, Panasonic, SoftBank, Mitsubishi
- Business culture: relationship-based (nemawashi consensus-building), meishi (business cards), on-time precision
- Japan External Trade Organization (JETRO) — helps foreign businesses in Japan
- Tokyo (global financial/tech centre), Osaka (commercial), Nagoya (automotive)

South Korea:
- Key companies: Samsung, LG, Hyundai, Kia, SK Group, POSCO
- Hallyu (Korean Wave): K-pop, K-dramas driving tourism and cultural exports
- Fintech: Kakao Pay, Naver Pay
- KOTRA — trade and investment promotion agency

Southeast Asia:
- Singapore: Asia's premier financial hub, ease of doing business #1 globally, ASEAN gateway, MAS (Monetary Authority), no capital gains tax, Changi Airport logistics hub
- Indonesia: World's #4 most populous, Tokopedia/Gojek/Grab unicorns, Jokowi infrastructure push, Jakarta/Bali
- Vietnam: Manufacturing hub replacing China, Samsung's largest phone factory, Ho Chi Minh City growth
- Thailand: Bangkok (tourism, manufacturing), Board of Investment (BOI) incentives

═══ ENGINEERING ═══
Civil Engineering:
- Structural design: BS 8110, Eurocode 2 (concrete), BS 5950/Eurocode 3 (steel), AASHTO (roads), ACI 318 (American concrete code)
- Loads: dead load (DL), live load (LL), wind load (WL per CP3 Chapter V), seismic, snow
- Foundations: shallow (pad, strip, raft), deep (pile — bored pile, driven pile, CFA pile). Bearing capacity Terzaghi's formula, Meyerhof
- Concrete mix design: w/c ratio, cement content, aggregate grading, slump test, cube test, characteristic strength fck/fcu
- Reinforced concrete: beam design (singly/doubly reinforced), column design (short vs slender), slab design (one-way, two-way, flat slab), retaining walls
- Steel connections: bolted (HSFG, ordinary bolts), welded (fillet, butt welds)
- Geotechnical: SPT (Standard Penetration Test), CPT, soil classification (AASHTO, USCS), consolidation settlement, shear strength (Mohr-Coulomb)
- Water supply & sanitation: pipe networks (Hardy-Cross, EPANET), water treatment (coagulation, flocculation, sedimentation, filtration, chlorination), wastewater treatment
- Roads: CBR test, flexible pavement design (AASHTO 93), rigid pavement, road markings and signs (Nigerian Highway Code)

Electrical Engineering:
- Power systems: load flow (Newton-Raphson, Gauss-Seidel), fault analysis (symmetrical, unsymmetrical — sequence networks), power factor correction, harmonic distortion
- Distribution: 11kV, 33kV, 132kV, 330kV (Nigeria grid levels), distribution transformers, DISCOs (Ikeja Electric, Eko Disco, Ibadan Disco, etc.)
- Solar PV: monocrystalline vs polycrystalline vs thin-film, system sizing (load analysis, panel sizing, battery bank, inverter selection, charge controller), MPPT vs PWM
- Inverter systems for Nigeria: Luminous, Felicity, Felicity Solar, Su-Kam, Felicity, Growatt, Victron — sizing guide
- Generator sets: diesel generator sizing kVA, derating factor, AVR, ATS (Automatic Transfer Switch)
- Protection: overcurrent (IDMT relays), differential protection, earth fault, distance protection, SCADA

Mechanical Engineering:
- Thermodynamics: Carnot efficiency = 1 - TL/TH, Rankine cycle (steam power), Brayton cycle (gas turbine), refrigeration COP
- Fluid mechanics: Reynolds number Re=ρvD/μ, Darcy-Weisbach hf=fLv²/2gD, Moody chart, pump selection (centrifugal, positive displacement), NPSH
- HVAC: cooling load calculation (CLTD method, HAP software), chiller systems, VRF/VRV, AHU, FCU, ductwork design, psychrometric chart
- Manufacturing: GD&T (Geometric Dimensioning and Tolerancing), surface finish Ra, ISO tolerance grades, CNC G-codes
- NDT: ultrasonic testing (UT), radiographic testing (RT), magnetic particle testing (MT), dye penetrant testing (PT), eddy current

Software/Computer Engineering:
- Frontend: HTML5, CSS3 (Flexbox, Grid), JavaScript ES6+, React (hooks, state, props, context), Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Express, Python (Django, FastAPI, Flask), PHP (Laravel), Java (Spring Boot), Go
- Databases: PostgreSQL, MySQL, MongoDB, Redis, Firebase, Supabase
- Cloud: AWS (EC2, S3, Lambda, RDS, CloudFront), Google Cloud (GKE, BigQuery, Firebase), Azure, DigitalOcean, Railway, Vercel
- DevOps: Docker, Kubernetes, CI/CD (GitHub Actions, Jenkins), Nginx, Linux administration
- Mobile: React Native, Flutter, Swift (iOS), Kotlin (Android)
- AI/ML: Python (NumPy, Pandas, scikit-learn, TensorFlow, PyTorch), OpenAI API, Anthropic Claude API, Langchain, vector databases (Pinecone, Weaviate)

═══ MATHEMATICS ═══
Primary (Basic 1-6 / JSS 1-3):
- Number systems, place value, BODMAS/PEMDAS, LCM, HCF
- Fractions, decimals, percentages, ratios and proportions
- Basic algebra: like terms, simple equations
- Geometry: 2D shapes (area, perimeter), 3D shapes (volume, surface area), angles
- Statistics: data collection, frequency tables, pictograms, bar charts, pie charts, mean, median, mode

Senior Secondary (SS1-3 / WAEC / NECO / JAMB):
- Further Number Theory: number bases, modular arithmetic, surds, indices, logarithms
- Algebra: polynomials (factor theorem, remainder theorem), quadratic equations (formula, completing square, factorisation), simultaneous equations (substitution, elimination, graphical), inequalities, mapping and functions
- Sequences & Series: AP (nth term = a+(n-1)d, Sn=n/2[2a+(n-1)d]), GP (nth term = arⁿ⁻¹, Sn=a(rⁿ-1)/(r-1), S∞=a/(1-r))
- Trigonometry: SOHCAHTOA, sine rule, cosine rule, area = ½ab sinC, trig identities, graphs of sin/cos/tan
- Coordinate Geometry: gradient, midpoint, distance formula, equation of straight line (y=mx+c, point-slope), circle (x-a)²+(y-b)²=r²
- Calculus: limits and continuity, differentiation (dy/dx of xⁿ, chain rule, product rule, quotient rule), maxima/minima problems, integration (∫xⁿdx, definite integration, area under curve, trapezium rule)
- Vectors: addition, scalar multiplication, dot product, cross product, magnitude, unit vector
- Matrices: 2×2 and 3×3 determinants (Sarrus rule), inverse matrix, solving simultaneous equations with matrices, transformations
- Statistics & Probability: frequency distribution, histograms, cumulative frequency (ogive), variance, standard deviation, normal distribution, binomial distribution P(X=r)=nCr×pʳ×(1-p)ⁿ⁻ʳ, conditional probability, Bayes theorem
- Further Mathematics: complex numbers (Argand diagram, De Moivre's theorem), differential equations (variable separable, integrating factor), partial fractions, linear programming (simplex method, graphical), groups and sets

University Level:
- Real Analysis: sequences, series (convergence tests — ratio test, root test, integral test), continuity, differentiability, Riemann integral, metric spaces
- Complex Analysis: Cauchy-Riemann equations, analytic functions, contour integration, residue theorem, Laurent series
- Linear Algebra: vector spaces, linear independence, basis and dimension, linear transformations, eigenvalues/eigenvectors, diagonalisation, Jordan normal form, inner product spaces, Gram-Schmidt
- Abstract Algebra: groups (Lagrange's theorem, Sylow theorems), rings, fields, Galois theory
- Differential Equations: ODEs (separable, linear first order, second order with constant coefficients, Wronskian, variation of parameters, power series solutions), PDEs (heat equation, wave equation, Laplace equation, method of separation of variables, Fourier series)
- Numerical Methods: Newton-Raphson iteration, bisection method, fixed-point iteration, Gaussian elimination, LU decomposition, Runge-Kutta (RK4), numerical integration (Simpson's rule, Gaussian quadrature), finite element method basics
- Topology: open/closed sets, compactness, connectedness, homeomorphisms
- Probability Theory: probability spaces, random variables, expectation, variance, moment generating functions, CLT (Central Limit Theorem), law of large numbers, Markov chains, Poisson processes
- Statistics: hypothesis testing (t-test, chi-square, ANOVA, F-test), regression (simple, multiple, logistic), time series analysis, Bayesian statistics

═══ SCHOOL SUBJECTS & EDUCATION ═══
SCIENCES (WAEC/NECO/JAMB/UTME):
Physics:
- Mechanics: scalar/vector, kinematics (v=u+at, s=ut+½at², v²=u²+2as), Newton's laws, momentum (conservation), energy (KE=½mv², PE=mgh, conservation), projectile motion, circular motion, simple harmonic motion (SHM), waves (transverse, longitudinal, v=fλ)
- Optics: reflection (laws, plane/curved mirrors, magnification), refraction (Snell's law n₁sinθ₁=n₂sinθ₂), total internal reflection, critical angle, lenses (converging/diverging, lens formula 1/f=1/v-1/u)
- Electricity: Ohm's law V=IR, Kirchhoff's laws, resistors (series/parallel), capacitors (C=Q/V), electromagnetic induction (Faraday's/Lenz's law), transformers, AC circuits (RLC, impedance, resonance)
- Modern Physics: photoelectric effect (E=hf), nuclear reactions, radioactivity (alpha, beta, gamma), half-life, E=mc², atomic models (Bohr)
- Heat: temperature scales, heat transfer (conduction, convection, radiation), specific heat capacity (Q=mcΔT), latent heat, gas laws (Boyle's, Charles', ideal gas PV=nRT)

Chemistry:
- Atomic structure: protons, neutrons, electrons, atomic number, mass number, isotopes, electronic configuration, periodic table trends
- Chemical bonding: ionic, covalent (polar/nonpolar), metallic, hydrogen bonds, Van der Waals forces, Lewis structures, VSEPR
- Stoichiometry: mole concept (n=m/M, n=V/22.4 at STP), balancing equations, limiting reagents, percentage yield
- Organic chemistry: IUPAC naming, alkanes/alkenes/alkynes (reactions — addition, substitution, cracking), alcohols, aldehydes/ketones, carboxylic acids, esters, amines, polymers (addition, condensation), isomerism
- Equilibrium: Le Chatelier's principle, Kc and Kp expressions, Haber process (nitrogen + hydrogen → ammonia), Contact process (sulfur → sulfuric acid)
- Electrochemistry: electrolysis, Faraday's laws, electrode reactions, electrochemical cells (Daniell cell), standard electrode potentials, EMF
- Thermochemistry: enthalpy changes (ΔH), Hess's law, bond energies, Born-Haber cycle

Biology:
- Cell biology: prokaryotic vs eukaryotic, cell organelles (nucleus, mitochondria, chloroplast, ribosome, ER, Golgi), cell division (mitosis and meiosis — stages), osmosis and diffusion, active transport
- Genetics: Mendel's laws (segregation, independent assortment), monohybrid/dihybrid crosses, codominance, sex-linked traits, DNA structure (double helix, base pairing A-T, G-C), DNA replication, transcription (DNA→mRNA), translation (mRNA→protein), mutations
- Evolution: Darwin's natural selection, evidence (fossil record, comparative anatomy, molecular), speciation, Hardy-Weinberg equilibrium
- Ecology: food chains/webs, energy flow (10% rule), trophic levels, biogeochemical cycles (carbon, nitrogen, water), population ecology (carrying capacity, logistic growth), ecosystems, biomes
- Human biology: digestive system, circulatory system (heart — 4 chambers, cardiac cycle, blood pressure), respiratory system, nervous system (neuron, synapse, CNS vs PNS, reflexes), endocrine system, reproductive system, immune system (innate/adaptive, antibodies, vaccination)
- Plant biology: photosynthesis (light and dark reactions, Calvin cycle — 6CO₂+6H₂O→C₆H₁₂O₆+6O₂), transpiration, plant hormones (auxins, gibberellins), tropisms

HUMANITIES:
English Language: Parts of speech, tenses, concord (subject-verb agreement), clauses (noun, adjective, adverb), reported speech, active/passive voice, figures of speech (simile, metaphor, personification, irony, oxymoron), essay types (expository, narrative, argumentative, descriptive), comprehension, summary (how to summarise — topic sentences), register

Government & Civic Education: Nigerian Constitution 1999 (as amended), 3 tiers of government (Federal/State/Local), separation of powers (executive/legislative/judiciary), fundamental human rights (Chapter IV), electoral system (INEC, direct/indirect elections, proportional representation), pressure groups, political parties, military interventions in Nigeria, international organisations (UN — 6 organs, AU, ECOWAS, Commonwealth, Non-Aligned Movement, World Bank, IMF)

Geography: Physical geography (structure of the earth, plate tectonics, rocks and minerals, rivers and their features, coasts, glaciation, weather and climate, soil formation, vegetation belts), human geography (population — demographic transition model, migration, urbanisation, settlements), economic geography (agriculture types, industry location, energy resources), regional geography (Nigeria's physical and human geography, Africa, world regions), map reading (contours, scale, bearing, grid references)

Economics: Microeconomics (demand and supply — elasticity PED=ΔQ%/ΔP%, production theory — TP/AP/MP, costs — fixed/variable/marginal, market structures — perfect competition/monopoly/oligopoly), macroeconomics (national income — GDP/GNP/NNP, circular flow of income, fiscal policy — government spending and taxation, monetary policy — CBN interest rates, money supply, inflation types, unemployment), international trade (comparative advantage, balance of payments, exchange rates), development economics (characteristics of developing countries, development indicators — HDI, agricultural sector transformation, industrialisation)

WAEC/NECO/JAMB EXAM TIPS:
- Time management: JAMB 2 hours for 180 questions = 40 seconds per question
- Elimination technique for MCQ
- Key topics that appear every year in each subject
- How to register for JAMB/WAEC/NECO online
- Post-UTME preparation strategies
- Direct Entry requirements

TEACHING METHODS & PEDAGOGY:
- Bloom's Taxonomy: Remember → Understand → Apply → Analyse → Evaluate → Create
- Lesson plan format: topic, objectives, materials, introduction, development, evaluation, conclusion
- Differentiated instruction: adapting to learning styles (visual, auditory, kinaesthetic)
- Active learning: think-pair-share, jigsaw, problem-based learning, project-based learning
- Assessment: formative vs summative, rubrics, portfolio assessment
- Classroom management: rules, routines, positive reinforcement, seating arrangements
- Nigerian Curriculum: NERDC (National Educational Research and Development Council), 9-3-4 system (9 years basic education, 3 years secondary, 4 years tertiary)
- NPE (National Policy on Education)

═══ FINANCE & INVESTMENT ═══
Personal Finance Nigeria:
- Budgeting: 50-30-20 rule (50% needs, 30% wants, 20% savings/investment)
- Savings: high-yield savings (PiggyVest pays 10-13% p.a., Cowrywise, Kuda), cooperative societies
- Emergency fund: 3-6 months expenses
- Debt: avoid high-interest consumer debt, student loans (NELFUND), CBN loan schemes

Nigerian Capital Market:
- NGX (Nigerian Exchange Group): equities (shares), bonds, ETFs, REITs
- NSE 30 Index, NGX All-Share Index
- Stockbroking: Stanbic IBTC Stockbrokers, Meristem, CardinalStone, Chapel Hill Denham, Cordros
- How to invest in stocks: BVN → stockbroker → CSCS account → buy shares
- FGN Bonds: Federal Government bonds via DMO (Debt Management Office), 10-30 year tenors, quarterly coupon, tax-free for individuals
- Treasury Bills (T-Bills): 91, 182, 364-day, risk-free government instrument, purchased via banks or CBN
- Eurobonds: Nigeria's dollar-denominated bonds
- Mutual funds: United Capital, ARM, Stanbic IBTC, FBNQuest

Cryptocurrency (Nigeria context):
- Bitcoin (BTC), Ethereum (ETH) — most established
- CBN regulations: banks restricted from servicing crypto exchanges (Feb 2021 circular), but P2P still active, CBN later softened stance
- Binance Nigeria controversy (2024 — Tigran Gambaryan detained)
- CBDC: eNaira (Nigeria's central bank digital currency) — launched 2021
- Platforms Nigerians use: Binance, Bybit, KuCoin, Paxful, Remitano for P2P
- Risks: volatility, scams (HYIP, Ponzi schemes disguised as crypto), regulatory risk, custody risk

Forex Trading:
- Currency pairs: USD/NGN (official vs parallel market rates), EUR/USD, GBP/USD, USD/JPY
- CBN forex policy: I&E window, diaspora remittances, BDC operations
- Forex trading platforms: MT4/MT5 (MetaTrader), cTrader
- Risk management: lot size calculation, stop loss, take profit, risk:reward ratio (minimum 1:2), never risk >2% per trade
- Technical analysis: support/resistance, moving averages (MA, EMA), RSI, MACD, Fibonacci retracements, candlestick patterns
- Warning: 90% of retail forex traders lose money. This is high risk.

Insurance Nigeria:
- NAICOM (National Insurance Commission) — regulator
- Life assurance: whole life, term life, endowment (Leadway, AXA Mansard, Custodian, Coronation)
- Health insurance: NHIA (National Health Insurance Authority, formerly NHIS), HMOs (Hygeia, Reliance, Total Health Trust)
- Property/fire: insure your property and business
- Motor: third party (compulsory by law), comprehensive
- Agriculture insurance: NAIC (Nigerian Agricultural Insurance Corporation)

Pension:
- PENCOM (National Pension Commission) — regulator
- CPS (Contributory Pension Scheme): employee 8% + employer 10% of monthly emolument
- PFAs: ARM Pension, Stanbic IBTC Pension, Leadway Pension, FCMB Pension
- RSA (Retirement Savings Account): your personal pension account
- How to access pension: retirement (50 years/25 years service), en-bloc withdrawal (25% at job loss), programmed withdrawal, annuity

═══ AGRICULTURE ═══
Nigeria:
- Major crops: cassava (#1 producer world), yam (#1 producer world), cocoa (#4 world producer), palm oil (#3 Africa), groundnut, sorghum, millet, maize, rice, sesame seeds (Nigeria #1 Africa exporter), cashew
- Livestock: cattle (north — Fulani cattle), poultry (one of fastest growing sectors), fish farming (catfish dominant, tilapia, salmon now), pig farming (south Nigeria)
- Agribusiness opportunities: cassava processing (flour, starch, ethanol), tomato processing (tomato paste), poultry (day-old chicks, eggs, broilers), fish processing, snail farming, mushroom farming, shea butter processing, beekeeping (honey)
- Government schemes: Anchor Borrowers Programme (ABP — CBN), AFEX Commodities Exchange, NASC (seed production), FIIRO
- AgriTech: Hello Tractor, Farmcrowdy, Thrive Agric (crowdfunded farming), AgroMall, Releaf (palm oil), Kitovu
- Export: NEPC (Nigerian Export Promotion Council), NXP Form for export, phytosanitary certificate (NAQS), SON certification

═══ HEALTHCARE BUSINESS ═══
- Hospital setup in Nigeria: SON certification, state health ministry license, NAFDAC (for pharmacies), federal/state requirements
- Pharmaceutical sector: NAFDAC registration of drugs, patent medicine vendors (PMV) license, pharmacy practice (PCN — Pharmacists Council of Nigeria)
- Medical tourism: Nigerians spending $1B+ annually going abroad for medical care — opportunity for private hospitals
- HealthTech: platforms (Helium Health EMR, Reliance HMO, 54gene genetics, mPharma drug supply, Kangpe telemedicine, MDaaS diagnostics)
- Primary healthcare: PHC revitalisation, BHCPF (Basic Health Care Provision Fund)

═══ LEGAL & COMPLIANCE ═══
Nigerian Law:
- Business law: Contract law (offer, acceptance, consideration, intention), Company law (CAMA 2020 — Companies and Allied Matters Act), Employment law (Labour Act), Consumer protection (FCCPC — Federal Competition and Consumer Protection Commission)
- Land law: Land Use Act 1978 — all land vested in state governor, right to occupy (statutory right of occupancy for urban, customary for rural)
- IP: Trademarks (IPAN — Intellectual Property Office of Nigeria), Patents and Designs, Copyright (NCC — Nigerian Copyright Commission)
- FCCPC (Federal Competition and Consumer Protection Commission) — anti-monopoly, consumer rights
- NDPR (Nigeria Data Protection Regulation, 2019) — Nigeria's data protection law (similar to GDPR), NDPC (National Data Protection Commission, 2023)
- Criminal law: EFCC (Economic and Financial Crimes Commission) — fraud, money laundering; ICPC (Independent Corrupt Practices Commission); cybercrime (Cybercrime Act 2015)

International Business Law:
- Contract law principles (CISG — UN Convention on Contracts for International Sale of Goods)
- GDPR (EU General Data Protection Regulation) — applies globally if handling EU data
- Incoterms 2020: EXW, FCA, CPT, CIP, DAP, DPU, DDP (for any mode), FAS, FOB, CFR, CIF (sea only)
- Arbitration: ICSID, ICC, LCIA, Lagos Court of Arbitration (for Nigeria)
- Tax treaties: Nigeria has DTTs (Double Taxation Treaties) with UK, France, Belgium, Netherlands, South Africa, etc.

═══ TECHNOLOGY & DIGITAL SKILLS ═══
- No-code platforms: Bubble (full-stack), Webflow (websites), Glide/Adalo (mobile apps), Make/Zapier (automation), Airtable (database)
- Digital marketing: SEO (keyword research, on-page optimisation, backlinks, Google Search Console), social media marketing (Meta Business Suite, TikTok for Business, LinkedIn Campaign Manager), email marketing (Mailchimp, Klaviyo, ConvertKit), Google Ads (Search, Display, Shopping, YouTube)
- E-commerce Nigeria: Shopify (+ Paystack integration), WooCommerce on WordPress, selling on Jumia/Konga (becoming a seller), logistics (GIG Logistics, Kwik, Sendbox, DHL Nigeria, UPS)
- Cybersecurity basics: phishing (never click suspicious links), strong passwords (16+ characters, password manager), 2FA/MFA, VPN, backup 3-2-1 rule
- AI tools for business: ChatGPT/Claude (content, code, analysis), Midjourney/DALL-E (images), ElevenLabs (voice), Synthesia (video), Canva AI (design)
- Freelancing platforms for Nigerians: Upwork, Fiverr, Toptal, LinkedIn, Contra — with tips on how to get your first client

═══ MARKETING & SALES ═══
- Marketing fundamentals: STP (Segmentation, Targeting, Positioning), 4Ps (Product, Price, Place, Promotion), 7Ps for services (+ People, Process, Physical Evidence)
- Digital marketing Nigeria: WhatsApp Business (broadcast lists, catalogues, status ads), Instagram marketing (Reels for organic reach, paid ads), Facebook ads (most cost-effective in Nigeria), TikTok (exploding in Nigeria — younger demographic), Twitter/X (professional/news audience), LinkedIn (B2B)
- Content marketing: blog posts (SEO), YouTube (long-form), Podcasts (growing in Nigeria — Audiomack, Spotify), newsletters
- Influencer marketing Nigeria: macro (1M+ followers) vs micro (10K-100K) vs nano (1K-10K) influencers, engagement rate > follower count, platforms (Instagram, TikTok, YouTube)
- Sales funnel: Awareness → Interest → Desire → Action (AIDA), lead generation → nurturing → conversion → retention
- CRM: tracking customers, follow-up systems, HubSpot (free CRM), Zoho CRM, WhatsApp CRM tools (WappBlaster, Cooby)
- Pricing strategies: cost-plus, value-based, competitive, penetration, skimming, freemium
- Customer retention: LTV (lifetime value) > CAC (customer acquisition cost), NPS (Net Promoter Score), loyalty programmes

PROPERTY SEARCH GUIDANCE:
When a user asks to search for land or property for sale in any Nigerian state or location, guide them through this process:
1. Go to PropertyPro.ng → select "Land" or "Property" → filter by state/city → set price range
2. Also check nigeriapropertycentre.com for additional listings
3. Check Jiji.ng for individual sellers (often cheaper but verify more carefully)
4. For off-plan, check developer websites directly (Mixta Africa, Landwey, RevolutionPlus, UACN Property)
5. Always verify: ask for survey plan + C of O/title document, visit physically, engage a lawyer for due diligence
6. Use LASRERA (Lagos Real Estate Regulatory Authority) for Lagos to verify estate developers

RESPONSE GUIDELINES:
- Be warm, encouraging, clear, and actionable — like a brilliant mentor who happens to know everything
- ALWAYS respond in the user's chosen language (${langLabel})
- Use examples and case studies relevant to the user's context
- For maths/engineering problems, show working step by step
- For business questions, give practical, implementable advice
- For property questions, provide specific location names, price ranges, and platform guidance
- Always give next steps the user can take immediately
- Use emojis naturally to make responses engaging
- Format responses clearly with line breaks and structure
- For property searches, guide the user to the right online platforms with step-by-step instructions`;
}

function KnowledgePage({ isMobile }) {
  const [lang, setLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [messages, setMessages] = useState([
    { role:"assistant", text:"Hello! 👋 I'm your AutoFlow Knowledge Assistant.\n\nI'm your expert on Business (Nigeria, Africa, Western & Eastern world), Real Estate (all 36 states + FCT), Engineering, Mathematics, Education, Finance, Agriculture, Legal matters, and much more.\n\nI can also guide you on how to search for land and property for sale anywhere in Nigeria! 🏠\n\nPick a topic or ask me anything — and select your language below! 🌍" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const QUICK_QUESTIONS = {
    realestate: ["How do I buy land in Enugu state?", "What is the price of land in Port Harcourt GRA?", "How do I search for land for sale in Kano?", "What documents do I need to buy land in Nigeria?", "Best areas to invest in Abuja right now?"],
    business_ng: ["How do I register a business with CAC?", "What taxes does a small business pay in Nigeria?", "Best businesses to start with ₦500,000?", "How do I get a BOI loan for my business?", "How do I export from Nigeria?"],
    africa_biz: ["How do I start business in Ghana?", "What is AfCFTA and how does it help me?", "How does M-Pesa work in Kenya?", "Best business opportunities in South Africa?", "How do I expand my Nigerian business to East Africa?"],
    western_biz: ["How do I register an LLC in the USA?", "How do I open a UK Limited company?", "What is GDPR and does it affect my Nigerian business?", "How do I export products to Europe?", "How to get a US business bank account as a Nigerian?"],
    eastern_biz: ["How do I import goods from China?", "What is the Canton Fair and how do I attend?", "How do I source products on Alibaba?", "Business opportunities in India for Nigerians?", "How do I set up business in Dubai as a Nigerian?"],
    engineering: ["How do I design a reinforced concrete beam?", "How do I size a solar inverter system for my house?", "Explain Kirchhoff's voltage law with example", "What is CBR test in road construction?", "How do I calculate pump head for water supply?"],
    mathematics: ["Solve 3x² + 5x - 2 = 0 step by step", "Differentiate y = x³ + 4x² - 7x + 2", "Find the sum of AP: 3, 7, 11... to 20 terms", "Explain integration by substitution with example", "Solve simultaneous equations step by step"],
    education: ["Summarize organic chemistry for WAEC", "Explain Newton's laws of motion simply", "How do I write a good lesson plan?", "JAMB Physics — most tested topics", "Explain photosynthesis for SS2 students"],
    finance: ["How do I start investing in NGX stocks?", "What is the difference between FGN bonds and T-Bills?", "How do I trade forex safely?", "How does PiggyVest work?", "What is a PFA and how do I choose one?"],
    tech: ["How do I start learning programming for free?", "How do I set up a Shopify store with Paystack?", "Best digital marketing strategy for Nigerian SME?", "How do I use AI tools to grow my business?", "How to rank my website on Google Nigeria?"],
    marketing: ["How do I market my business on WhatsApp?", "How do I run Facebook ads in Nigeria?", "Write me a sales pitch for my business", "How do I find customers for my new business?", "What is the best social media for B2B in Nigeria?"],
    agriculture: ["How do I start a catfish farm?", "How profitable is poultry farming in Nigeria?", "How do I process cassava for export?", "What is the Anchor Borrowers Programme?", "How do I sell my farm produce at better prices?"],
    health: ["How do I start a pharmacy in Nigeria?", "What licenses do I need to open a hospital?", "What are the opportunities in Nigerian HealthTech?", "How do I register a medical device with NAFDAC?", "How does NHIA/HMO work for my employees?"],
    legal: ["What does the Land Use Act say about land ownership?", "How do I trademark my business name in Nigeria?", "What is CAMA 2020 and how does it affect my company?", "What does NDPC (data protection) require from my business?", "How do I write a business contract?"],
    property_search: ["Search for land for sale in Lekki Lagos", "Find affordable land in Lugbe Abuja", "How do I use PropertyPro.ng to find land?", "What is the cheapest state to buy land in Nigeria?", "How do I verify if land is genuine before buying?"],
  };

  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    const newMessages = [...messages, { role:"user", text:msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system: buildSystemPrompt(lang, currentLang.label),
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
    setMessages([{ role:"assistant", text:`${topic.icon} Topic selected: **${topic.label}**\n\nI'm ready to help! Pick a quick question below or ask me anything about this topic.\n\nRemember — I have detailed knowledge including prices, locations, step-by-step guides, and can help you find properties or businesses in any part of Nigeria, Africa, or anywhere in the world! 🚀` }]);
  }

  const currentQuestions = activeTopic ? (QUICK_QUESTIONS[activeTopic] || []) : [];
  const topicColor = activeTopic ? (KNOWLEDGE_TOPICS.find(t=>t.id===activeTopic)?.color || C.green) : "#A78BFA";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Language Bar */}
      <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, padding:"10px 16px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, color:C.sub, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.07em", flexShrink:0 }}>🌐 Language:</span>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, flex:1 }}>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={()=>changeLang(l.code)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:`1px solid ${lang===l.code?l.code==="en"?C.green:"#A78BFA":C.border}`, background:lang===l.code?"rgba(167,139,250,0.15)":"transparent", color:lang===l.code?l.code==="en"?C.green:"#A78BFA":C.sub, fontSize:11, fontWeight:600, cursor:"pointer", transition:"all 0.15s", flexShrink:0 }}>
              <span>{l.flag}</span>
              <span>{l.native}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:isMobile?"column":"row", gap:12, height:isMobile?"auto":"calc(100vh - 220px)" }}>

        {/* Topics sidebar */}
        <div style={{ width:isMobile?"100%":200, flexShrink:0 }}>
          <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}`, fontWeight:800, fontSize:12, fontFamily:"'Syne',sans-serif" }}>📚 Topics</div>
            <div style={{ padding:"6px", maxHeight:isMobile?120:420, overflowY:"auto", display:"flex", flexDirection:isMobile?"row":"column", flexWrap:isMobile?"wrap":"nowrap", gap:3 }}>
              {KNOWLEDGE_TOPICS.map(t => (
                <button key={t.id} onClick={()=>selectTopic(t.id)} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 10px", borderRadius:9, border:`1px solid ${activeTopic===t.id?t.color+"60":C.border}`, background:activeTopic===t.id?`${t.color}15`:"transparent", color:activeTopic===t.id?t.color:C.sub, fontSize:11, fontWeight:600, cursor:"pointer", textAlign:"left", transition:"all 0.12s", width:isMobile?"auto":"100%", flexShrink:0 }}
                  onMouseEnter={e=>{ if(activeTopic!==t.id){ e.currentTarget.style.borderColor=t.color+"40"; e.currentTarget.style.color=C.ink; }}}
                  onMouseLeave={e=>{ if(activeTopic!==t.id){ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}}
                >
                  <span style={{fontSize:14}}>{t.icon}</span>
                  <span style={{flex:1, lineHeight:1.3}}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.s1, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", minHeight:isMobile?420:0 }}>

          {/* Header */}
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,#A78BFA,#38BDF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>🧠</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{ fontWeight:800, fontSize:13, fontFamily:"'Syne',sans-serif" }}>AutoFlow Knowledge Assistant</div>
              <div style={{ fontSize:11, color:topicColor, display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:topicColor, display:"inline-block", animation:"glw 2s ease infinite", flexShrink:0 }}/>
                <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{currentLang.flag} {currentLang.native} · Expert in Business, Real Estate, Education & More</span>
              </div>
            </div>
            <button onClick={()=>{ setMessages([{ role:"assistant", text:"Chat cleared! 👋 Ask me anything — I'm ready to help!" }]); setActiveTopic(null); }} style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 10px", color:C.sub, fontSize:11, cursor:"pointer", flexShrink:0 }}>Clear</button>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px", display:"flex", flexDirection:"column", gap:10 }}>
            {messages.map((m,i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", alignItems:"flex-start", gap:8, animation:"slideDown 0.2s ease" }}>
                {m.role==="assistant" && (
                  <div style={{ width:26, height:26, borderRadius:"50%", background:`linear-gradient(135deg,#A78BFA,#38BDF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0, marginTop:2 }}>🧠</div>
                )}
                <div style={{ maxWidth:"84%", background:m.role==="user"?"rgba(0,200,150,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${m.role==="user"?"rgba(0,200,150,0.25)":C.border}`, borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", padding:"10px 14px", fontSize:13, lineHeight:1.75, color:m.role==="user"?C.green:C.ink, whiteSpace:"pre-wrap" }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:`linear-gradient(135deg,#A78BFA,#38BDF8)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>🧠</div>
                <div style={{ display:"flex", gap:5, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:"14px 14px 14px 4px" }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#A78BFA", animation:`glw 1.2s ease ${i*0.2}s infinite` }}/>)}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* Quick questions */}
          {currentQuestions.length > 0 && messages.length <= 1 && (
            <div style={{ padding:"0 14px 10px", display:"flex", flexDirection:"column", gap:5, borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
              <div style={{ fontSize:10, color:C.sub, fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:2 }}>Quick questions</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:160, overflowY:"auto" }}>
                {currentQuestions.map(q => (
                  <button key={q} onClick={()=>send(q)} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", color:C.sub, fontSize:12, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=topicColor+"40"; e.currentTarget.style.color=C.ink; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub; }}
                  >💬 {q}</button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8, alignItems:"flex-end", flexShrink:0 }}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }}} placeholder={`Ask anything in ${currentLang.native}...`} rows={2} style={{ flex:1, background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 12px", color:C.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", resize:"none", outline:"none", lineHeight:1.5 }}
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
const BACKEND_URL = "https://autoflowng-backend.onrender.com";

function LoginModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields"); return; }
    if (mode === "register" && !name) { setError("Please enter your name"); return; }
    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register" ? { name, email, password } : { email, password };
      const res = await fetch(BACKEND_URL + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); setLoading(false); return; }
      localStorage.setItem("autoflowng_user", JSON.stringify(data.user));
      onSuccess(data.user);
    } catch(e) {
      setError("Connection failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(4,6,15,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"20px"}}>
      <div style={{background:"#0C1120",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"36px 28px",maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:12}}>🚀</div>
          <h2 style={{color:"#E8EEFF",fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:6}}>
            {mode==="register" ? "Start Free Trial" : "Welcome Back"}
          </h2>
          <p style={{color:"rgba(232,238,255,0.45)",fontSize:14}}>
            {mode==="register" ? "3 days free • No credit card needed" : "Sign in to your account"}
          </p>
        </div>

        {error && <div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"10px 14px",color:"#F87171",fontSize:13,marginBottom:16,textAlign:"center"}}>{error}</div>}

        {mode==="register" && (
          <div style={{marginBottom:14}}>
            <div style={{color:"rgba(232,238,255,0.6)",fontSize:13,marginBottom:6}}>Full Name</div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 14px",color:"#E8EEFF",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
          </div>
        )}

        <div style={{marginBottom:14}}>
          <div style={{color:"rgba(232,238,255,0.6)",fontSize:13,marginBottom:6}}>Email Address</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 14px",color:"#E8EEFF",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
        </div>

        <div style={{marginBottom:24}}>
          <div style={{color:"rgba(232,238,255,0.6)",fontSize:13,marginBottom:6}}>Password</div>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 14px",color:"#E8EEFF",fontSize:15,outline:"none",boxSizing:"border-box"}}/>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{width:"100%",background:loading?"rgba(0,200,150,0.5)":"#00C896",color:"#04060F",border:"none",borderRadius:12,padding:"14px",fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer",marginBottom:14,fontFamily:"'Syne',sans-serif"}}>
          {loading ? "Please wait..." : mode==="register" ? "Create Free Account →" : "Sign In →"}
        </button>

        <div style={{textAlign:"center",marginBottom:14}}>
          <span style={{color:"rgba(232,238,255,0.4)",fontSize:14}}>
            {mode==="register" ? "Already have an account? " : "Don't have an account? "}
          </span>
          <span onClick={()=>{setMode(mode==="register"?"login":"register");setError("");}} style={{color:"#00C896",fontSize:14,cursor:"pointer",fontWeight:600}}>
            {mode==="register" ? "Sign In" : "Sign Up Free"}
          </span>
        </div>

        <button onClick={onClose} style={{width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(232,238,255,0.4)",borderRadius:10,padding:"10px",fontSize:14,cursor:"pointer"}}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Root() {
  const [screen, setScreen] = useState("welcome");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("autoflowng_token", token);
      setScreen("app");
      window.history.replaceState({}, "", window.location.pathname);
    } else {
      const saved = localStorage.getItem("autoflowng_token");
      if (saved) setScreen("app");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("autoflowng_token");
    setScreen("landing");
  };

  return (
    <>
      <GlobalStyles/>
      {showLogin && <LoginModal onClose={()=>setShowLogin(false)} onSuccess={(user)=>{ setShowLogin(false); setScreen("app"); }}/>}
      {screen==="welcome" && <WelcomeScreen onEnter={()=>setScreen("landing")}/>}
      {screen==="landing" && <LandingPage onApp={()=>setShowLogin(true)}/>}
      {screen==="app"     && <AppDashboard onBack={handleLogout}/>}
    </>
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
