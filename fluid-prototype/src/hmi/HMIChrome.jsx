import React, { useState, useEffect } from 'react';
import BMWIcon from './BMWIcons.jsx';

// ──────────────────────────────────────────────────────────
// HMIDisplay — Panoramic Vision widescreen with chamfered corners.
// Fixed 1920x720 canvas, auto-scaled to fit viewport.
// ──────────────────────────────────────────────────────────
export function HMIDisplay({ children, width = 1920, height = 720 }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setScale(Math.min(vw / width, vh / height, 2));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [width, height]);

  const w = width, h = height;
  const cx = 168, cy = 140;
  const lean = 96;
  const verts = [
    [cx, 0],
    [w - lean, 0],
    [w, h - cy],
    [w - cx, h],
    [lean, h],
    [0, cy],
  ];
  const clip = "polygon(" + verts.map(([x, y]) =>
    `${(x / w * 100).toFixed(2)}% ${(y / h * 100).toFixed(2)}%`
  ).join(", ") + ")";

  return (
    <div style={{
      width: "100vw", height: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#050B17", overflow: "hidden",
    }}>
      <div className="bmw-root hmi-display" style={{
        position: "relative",
        width, height,
        background: "#0A1428",
        clipPath: clip,
        overflow: "hidden",
        transform: `scale(${scale})`,
        transformOrigin: "center",
        filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.6))",
      }}>
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// HMIHeader — floating transparent status bar
// ──────────────────────────────────────────────────────────
export function HMIHeader({ title, leftIcon = "wrench", warningCount = 2, time, suffix, outdoor = "23 °C" }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, "0");
  const isPM = hours >= 12;
  const displayTime = time || `${hours > 12 ? hours - 12 : hours || 12}:${mins}`;
  const displaySuffix = suffix || (isPM ? "pm" : "am");

  return (
    <>
      <div style={{
        position: "absolute", top: 0, right: 0, width: 780, height: 56,
        background: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0) 100%)",
        WebkitMaskImage: "linear-gradient(270deg, #000 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)",
        maskImage: "linear-gradient(270deg, #000 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)",
        zIndex: 9, pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 56,
        display: "flex", alignItems: "center", padding: "0 90px 0 160px",
        gap: 18, zIndex: 10,
      }}>
        <div style={{ position: "relative", display: "inline-flex" }}>
          <BMWIcon name={leftIcon} size={24} color="#F0C040"/>
          {warningCount > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -8,
              background: "#F0C040", color: "#0A1428",
              borderRadius: 999, fontSize: 11, fontWeight: 700,
              minWidth: 16, height: 16, padding: "0 4px",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              letterSpacing: 0,
            }}>{warningCount}</span>
          )}
        </div>
        {title && <span style={{ fontSize: 22, fontWeight: 400, color: "#fff" }}>{title}</span>}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#fff" }}>
          <BMWIcon name="bell" size={22}/>
          <span style={{ fontSize: 18, color: "#fff", letterSpacing: 0.02 }}>{outdoor}</span>
          <BMWIcon name="mute" size={22}/>
          <BMWIcon name="bluetooth" size={20}/>
          <BMWIcon name="wifi" size={20}/>
          <BMWIcon name="mic" size={20}/>
          <img src="/bmw-hmi/bmw-roundel.png" width={28} height={28} alt="BMW" style={{ borderRadius: '50%' }} />
          <span style={{ fontSize: 22, fontWeight: 300, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
            {displayTime}<span style={{ fontSize: 14, marginLeft: 4, color: "#A8B5C8" }}>{displaySuffix}</span>
          </span>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────
// ClimateBlock — driver/passenger climate controls
// ──────────────────────────────────────────────────────────
const iconBtnStyle = {
  background: "transparent", border: 0, color: "#fff",
  width: 44, height: 44, borderRadius: 999,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

export function ClimateBlock({ side, temp, indicator, status = "A/C OFF" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <BMWIcon name="park" size={26} color="#fff"/>
      <button style={iconBtnStyle}>
        <BMWIcon name="minus" size={24}/>
      </button>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 110 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 300, color: "#fff", letterSpacing: -0.01 }}>{temp}°</span>
          {indicator && <span style={{ fontSize: 16, color: "#A8B5C8" }}>{indicator}</span>}
          <BMWIcon name="seat" size={20} color="#fff"/>
        </div>
        <div style={{ width: 80, height: 3, borderRadius: 2,
          background: "linear-gradient(90deg,#5BA3FF,#1C69D4 40%,#E63946)" }}/>
        <span style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "#A8B5C8" }}>{status}</span>
      </div>
      <button style={iconBtnStyle}>
        <BMWIcon name="plus" size={24}/>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// HMIFooter — climate left + 7 quick-actions + climate right
// ──────────────────────────────────────────────────────────
export function HMIFooter({ active = "home", onTab = () => {}, chamferReserve = 168 }) {
  const tabs = [
    { id: "media", icon: "music" },
    { id: "nav",   icon: "forward" },
    { id: "phone", icon: "phone" },
    { id: "home",  icon: "home" },
    { id: "fan",   icon: "fan" },
    { id: "car",   icon: "car" },
    { id: "apps",  icon: "apps" },
  ];
  return (
    <>
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 96,
        background: "linear-gradient(0deg, #000 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0) 100%)",
        zIndex: 9, pointerEvents: "none",
      }}/>
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: 96, display: "flex", alignItems: "center",
        paddingLeft: 140, paddingRight: 24 + chamferReserve, gap: 24, zIndex: 10,
      }}>
        <ClimateBlock side="L" temp="20.0"/>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 28 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => onTab(t.id)} style={{
              background: "transparent",
              border: 0, cursor: "pointer",
              width: 64, height: 64, borderRadius: 16,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: active === t.id ? "#5BA3FF" : "#fff",
            }}>
              <BMWIcon name={t.icon} size={32}/>
            </button>
          ))}
        </div>
        <ClimateBlock side="R" temp="16.5" indicator="L"/>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────
// LeftSideSlot — vehicle status icons (door, camera, rec)
// ──────────────────────────────────────────────────────────
export function LeftSideSlot() {
  const slantDeg = Math.atan2(96, 580) * 180 / Math.PI;
  return (
    <div style={{
      position: "absolute", left: 48, top: "50%", transform: "translateY(-50%)", width: 140,
      display: "flex", flexDirection: "column", alignItems: "flex-start",
      gap: 14, zIndex: 5,
    }}>
      <div style={{
        marginLeft: 0,
        width: 56, height: 84, position: "relative",
        background: "rgba(255,255,255,0.04)", borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `rotate(${(-slantDeg).toFixed(2)}deg)`,
        transformOrigin: "center",
      }}>
        <svg width="40" height="68" viewBox="0 0 40 68" fill="none">
          <rect x="6" y="4" width="28" height="60" rx="10" stroke="#A8B5C8" strokeWidth="1.5"/>
          <rect x="11" y="14" width="18" height="18" rx="2" stroke="#A8B5C8" strokeWidth="1.2"/>
          <rect x="11" y="36" width="18" height="20" rx="2" stroke="#A8B5C8" strokeWidth="1.2"/>
          <line x1="6" y1="22" x2="0" y2="28" stroke="#E63946" strokeWidth="2.5"/>
        </svg>
      </div>
      <div style={{ marginLeft: 14, width: 56, display: "flex", justifyContent: "center" }}>
        <BMWIcon name="camera" size={26} color="#A8B5C8"/>
      </div>
      <div style={{ marginLeft: 22, width: 56, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: "#E63946", boxShadow: "0 0 8px #E63946" }}/>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// RightSideSlot — view controls in the chamfered corner
// ──────────────────────────────────────────────────────────
const parallelogramClip = (slant = 14) =>
  `polygon(0 0, calc(100% - ${slant}px) 0, 100% 100%, ${slant}px 100%)`;

export function RightSideSlot({ onClose, showPark = true }) {
  const btnH = 72;
  const btnW = 96;
  const btnSlant = Math.round(btnH * (96 / 580));
  const parallelBtn = {
    background: "#1B2A45",
    color: "#fff", border: 0, cursor: "pointer",
    clipPath: parallelogramClip(btnSlant),
    width: btnW, height: btnH,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 4,
    fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase",
  };
  return (
    <div style={{
      position: "absolute", right: 100, top: 80, bottom: 130, width: 200,
      display: "flex", flexDirection: "column", alignItems: "flex-end",
      gap: 12, padding: 0, zIndex: 5,
    }}>
      <button onClick={onClose} style={{ ...parallelBtn, marginRight: 8 }}>
        <BMWIcon name="settings" size={26}/>
      </button>
      <div style={{ flex: 1 }} />
      <button style={{ ...parallelBtn, marginRight: -40 }}>
        <BMWIcon name="compass" size={26}/>
        <span style={{ color: "#A8B5C8" }}>N</span>
      </button>
      <button style={{ ...parallelBtn, marginRight: -56 }}>
        <span style={{ color: "#fff", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.2, textAlign: "center" }}>Assist<br/>View</span>
      </button>
      {showPark && (
        <div style={{
          marginTop: "auto", marginBottom: 16, marginRight: 12,
          width: 130, height: 170, position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: 999,
            background: "conic-gradient(from 320deg,#3CD278 0 25%,#F0C040 25% 50%,#FF4040 50% 60%,transparent 60%)",
            filter: "blur(1px)", opacity: 0.7,
          }}/>
          <div style={{
            position: "absolute", inset: 18, borderRadius: 16,
            background: "linear-gradient(180deg,#34538D,#1B2A45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="50" height="100" viewBox="0 0 40 80" fill="none">
              <rect x="6" y="4" width="28" height="72" rx="10" fill="#0A1428" stroke="#5BA3FF" strokeWidth="1.5"/>
              <rect x="10" y="20" width="20" height="14" rx="2" fill="#1C69D4" opacity="0.5"/>
              <rect x="10" y="40" width="20" height="20" rx="2" fill="#1C69D4" opacity="0.3"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// MapBackground — SVG night map placeholder
// ──────────────────────────────────────────────────────────
export function MapBackground() {
  return (
    <svg viewBox="0 0 1920 720" preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect width="1920" height="720" fill="#0F1A2C"/>
      {Array.from({length: 14}).map((_,i)=>(
        <path key={"h"+i} d={`M0 ${80+i*50} L1920 ${60+i*50}`} stroke="#3A4A66" strokeWidth="1.2" fill="none" opacity="0.7"/>
      ))}
      {Array.from({length: 18}).map((_,i)=>(
        <path key={"v"+i} d={`M${110+i*105} 0 L${90+i*105} 720`} stroke="#3A4A66" strokeWidth="1.2" fill="none" opacity="0.5"/>
      ))}
    </svg>
  );
}
