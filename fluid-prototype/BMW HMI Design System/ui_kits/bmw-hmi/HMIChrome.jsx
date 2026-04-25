// BMW HMI UI Kit — shared layout components
// Loaded as a Babel script. Components export to window for cross-file scope.

const { useState } = React;

// ──────────────────────────────────────────────────────────
// Shaped display container — Panoramic Vision widescreen.
// Rectangle with two mirrored chamfers (top-left + bottom-right),
// matching the real central display geometry.
// ──────────────────────────────────────────────────────────
function HMIDisplay({ children, width = 1600, height = 720 }) {
  // Parallelogram leaning right, with chamfered top-left and bottom-right.
  // Both chamfers identical 45° angle. Side edges are slanted (lean) so the
  // overall shape is a rhombus / parallelogram, not a rectangle.
  const w = width, h = height;
  const cx = 140, cy = 140;   // chamfer size, identical on both corners
  const lean = 80;            // horizontal slant — top edge is shifted right of bottom edge
  // 6 vertices, in px (lean nach LINKS — bottom edge ist nach rechts verschoben):
  //   1. top-left of top edge  (cx, 0)
  //   2. top-right             (w - lean, 0)
  //   3. right tip before BR   (w, h - cy)
  //   4. bottom-right after BR (w - cx, h)
  //   5. bottom-left           (lean, h)
  //   6. left tip after TL     (0, cy)
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
    <div className="bmw-root hmi-display" style={{
      position: "relative",
      width, height,
      background: "var(--surface-canvas)",
      clipPath: clip,
      overflow: "hidden",
      filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.6))",
    }}>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Header — floating, transparent, status icons row
// ──────────────────────────────────────────────────────────
function HMIHeader({ title, leftIcon = "wrench", warningCount = 2, time = "2:55", suffix = "pm", outdoor = "23 °C" }) {
  return (
    <>
      {/* Gradient behind status icons:
          - dark across the full top edge, fading down to transparent
          - additionally masked so it fades from solid on the right to transparent on the left */}
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
        <span style={{
          width: 28, height: 28, borderRadius: 999,
          background: "conic-gradient(#1C69D4 0 25%, #5BA3FF 25% 50%, #3CD278 50% 75%, #F0C040 75%)",
          border: "1.5px solid #fff",
        }}/>
        <span style={{ fontSize: 22, fontWeight: 300, color: "#fff" }}>
          {time}<span style={{ fontSize: 14, marginLeft: 4, color: "#A8B5C8" }}>{suffix}</span>
        </span>
      </div>
    </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Footer — climate left + center quick-actions + climate right
// ──────────────────────────────────────────────────────────
function ClimateBlock({ side, temp, indicator, status = "A/C OFF" }) {
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
        <span style={{ fontSize: 12, letterSpacing: 0.06, textTransform: "uppercase", color: "#A8B5C8" }}>{status}</span>
      </div>
      <button style={iconBtnStyle}>
        <BMWIcon name="plus" size={24}/>
      </button>
    </div>
  );
}
const iconBtnStyle = {
  background: "transparent", border: 0, color: "#fff",
  width: 44, height: 44, borderRadius: 999,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

function HMIFooter({ active = "home", onTab = () => {}, chamferReserve = 140 }) {
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
      {/* Vertical gradient — dark at the bottom edge, fading to transparent toward the screen center */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: 96,
        background: "linear-gradient(0deg, #000 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0) 100%)",
        zIndex: 9, pointerEvents: "none",
      }}/>
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0,
      height: 96, display: "flex", alignItems: "center",
      paddingLeft: 116, paddingRight: 24 + chamferReserve, gap: 24, zIndex: 10,
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
// Left side-slot — vehicle status icons (door / belt / camera)
// ──────────────────────────────────────────────────────────
function LeftSideSlot() {
  // Display left edge slope: 80px shift over 580px height ≈ 7.86°.
  // Stack icons close together at the top with their marginLeft progressively
  // increasing to follow the slant. Rotate the car schematic to match.
  const slantDeg = Math.atan2(80, 580) * 180 / Math.PI; // ≈ 7.86
  return (
    <div style={{
      position: "absolute", left: 40, top: "50%", transform: "translateY(-50%)", width: 140,
      display: "flex", flexDirection: "column", alignItems: "flex-start",
      gap: 14, zIndex: 5,
    }}>
      {/* mini car schematic — rotated to match the slant */}
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
          {/* open door indicator */}
          <line x1="6" y1="22" x2="0" y2="28" stroke="#E63946" strokeWidth="2.5"/>
        </svg>
      </div>
      {/* camera — slightly indented to follow slant */}
      <div style={{ marginLeft: 14, width: 56, display: "flex", justifyContent: "center" }}>
        <BMWIcon name="camera" size={26} color="#A8B5C8"/>
      </div>
      {/* recording dot — further indented */}
      <div style={{ marginLeft: 22, width: 56, display: "flex", justifyContent: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: "#E63946", boxShadow: "0 0 8px #E63946" }}/>
      </div>
    </div>
  );
}

// Parallelogram clip-path matching the display slant.
// Display's left edge runs (0, top) → (lean, bottom): top-left of polygon is
// pulled LEFT, bottom-left pushed RIGHT. Same for the right edge.
// Both side edges therefore run from top-LEFT to bottom-RIGHT (positive slope).
const parallelogramClip = (slant = 14) =>
  `polygon(0 0, calc(100% - ${slant}px) 0, 100% 100%, ${slant}px 100%)`;

// ──────────────────────────────────────────────────────────
// Right side-slot — park assist + view controls (chamfer area)
// ──────────────────────────────────────────────────────────
function RightSideSlot({ onClose, showPark = true }) {
  // Display side-edge slope: lean(80) over (height − chamfer) = 80/580 ≈ 0.138.
  // Buttons are btnH tall, so slant must equal btnH * slope to stay parallel.
  const btnH = 72;
  const btnW = 96;
  const btnSlant = Math.round(btnH * (80 / 580));  // ≈ 10
  const parallelBtn = {
    background: "#1B2A45",
    color: "#fff", border: 0, cursor: "pointer",
    clipPath: parallelogramClip(btnSlant),
    width: btnW, height: btnH,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 4,
    fontSize: 11, letterSpacing: 0.06, textTransform: "uppercase",
  };
  return (
    <div style={{
      position: "absolute", right: 90, top: 80, bottom: 130, width: 200,
      display: "flex", flexDirection: "column", alignItems: "flex-end",
      gap: 12, padding: 0, zIndex: 5,
    }}>
      <button onClick={onClose} style={{ ...parallelBtn, marginRight: 8 }}>
        <BMWIcon name="settings" size={26}/>
      </button>
      {/* spacer pushes the bottom two buttons into the bottom-right corner */}
      <div style={{ flex: 1 }} />
      <button style={{ ...parallelBtn, marginRight: -40 }}>
        <BMWIcon name="compass" size={26}/>
        <span style={{ color: "#A8B5C8" }}>N</span>
      </button>
      <button style={{ ...parallelBtn, marginRight: -56 }}>
        <span style={{ color: "#fff", fontSize: 11, letterSpacing: 0.06, textTransform: "uppercase", lineHeight: 1.2, textAlign: "center" }}>Assist<br/>View</span>
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

Object.assign(window, { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, ClimateBlock });
