// BMW HMI — screen-level views (Map, Climate, Charging, Notifications, Phone)
// Loaded after HMIChrome.jsx; relies on its globals.

const { useMemo } = React;

// ──────────────────────────────────────────────────────────
// Map background — SVG night map
// ──────────────────────────────────────────────────────────
function MapBackground() {
  return (
    <svg viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect width="1600" height="720" fill="#0F1A2C"/>
      {/* minor roads grid */}
      {Array.from({length: 12}).map((_,i)=>(
        <path key={"h"+i} d={`M0 ${100+i*55} L1600 ${80+i*55}`} stroke="#3A4A66" strokeWidth="1.2" fill="none" opacity="0.7"/>
      ))}
      {Array.from({length: 14}).map((_,i)=>(
        <path key={"v"+i} d={`M${120+i*110} 0 L${100+i*110} 720`} stroke="#3A4A66" strokeWidth="1.2" fill="none" opacity="0.5"/>
      ))}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────
// Map screen — POI card + tabs
// ──────────────────────────────────────────────────────────
function MapScreen({ activeTab, setActiveTab }) {
  const tabs = ["Route","Map","Charging","Other","Development"];
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <MapBackground/>
      {/* search bar */}
      <div style={{
        position: "absolute", top: 94, left: 170, width: 360,
        background: "rgba(27,42,69,0.85)", backdropFilter: "blur(8px)",
        borderRadius: 4, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <BMWIcon name="search" size={20} color="#A8B5C8"/>
        <span style={{ fontSize: 18, color: "#8C9BB0", flex: 1 }}>Search</span>
      </div>
      {/* POI card */}
      <div style={{
        position: "absolute", top: 164, left: 170, width: 360,
        background: "linear-gradient(180deg,#243757,#1B2A45)",
        borderRadius: 4, padding: 20,
        boxShadow: "0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize: 14, letterSpacing: 0.06, textTransform: "uppercase", color: "#A8B5C8", marginBottom: 8 }}>A9 · Highway</div>
        <div style={{ fontSize: 28, fontWeight: 300, color: "#fff", lineHeight: 1.15 }}>AC Mer Germany GmbH</div>
        <div style={{ fontSize: 16, color: "#A8B5C8", marginTop: 6 }}>Schloßstraße 14, 80803 München</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(60,210,120,0.16)", color: "#3CD278", padding: "6px 12px", borderRadius: 999, fontSize: 13, letterSpacing: 0.06, textTransform: "uppercase" }}>Available</span>
          <span style={{ background: "#1C69D4", color: "#fff", padding: "6px 12px", borderRadius: 999, fontSize: 13, letterSpacing: 0.06, textTransform: "uppercase" }}>22 kW</span>
        </div>
        <button style={{
          marginTop: 16, width: "100%", background: "#1C69D4", color: "#fff",
          border: 0, borderRadius: 4, padding: "14px 18px", fontSize: 18, cursor: "pointer",
          boxShadow: "0 0 20px rgba(28,105,212,0.5)",
        }}>Start route guidance</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Climate screen — central car render with hot-spots
// ──────────────────────────────────────────────────────────
function ClimateScreen() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: "70px 240px 110px 200px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, letterSpacing: 0.06, textTransform: "uppercase", color: "#A8B5C8" }}>Climate comfort</div>
          <div style={{ fontSize: 36, fontWeight: 300, color: "#fff", marginTop: 6 }}>Auto · 20.0°</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["Auto", "Off", "Max A/C", "Defrost"].map((l, i) => (
            <button key={l} style={{
              background: i === 0 ? "#1C69D4" : "rgba(27,42,69,0.85)",
              boxShadow: i === 0 ? "0 0 16px rgba(28,105,212,0.6)" : "none",
              color: "#fff", border: 0, borderRadius: 8,
              padding: "12px 18px", fontSize: 16, letterSpacing: 0.06,
              textTransform: "uppercase", cursor: "pointer",
            }}>{l}</button>
          ))}
        </div>
      </div>
      {/* car render */}
      <div style={{
        marginTop: 24, height: 380, position: "relative",
        background: "radial-gradient(ellipse at center, rgba(28,105,212,0.18), transparent 60%)",
        display: "flex", justifyContent: "center", alignItems: "center",
      }}>
        <svg width="320" height="380" viewBox="0 0 200 240" fill="none">
          <defs>
            <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#34538D"/>
              <stop offset="1" stopColor="#0E1B30"/>
            </linearGradient>
          </defs>
          <rect x="40" y="20" width="120" height="200" rx="40" fill="url(#carBody)" stroke="#5BA3FF" strokeWidth="1.5"/>
          {/* windscreen */}
          <path d="M55 60 Q100 50 145 60 L150 90 Q100 80 50 90 Z" fill="#1C69D4" opacity="0.35"/>
          {/* steering wheel */}
          <circle cx="80" cy="90" r="14" stroke="#fff" strokeWidth="1.5" fill="#0A1428"/>
          <circle cx="80" cy="90" r="3" fill="#fff"/>
          {/* seats */}
          <rect x="62" y="115" width="32" height="42" rx="6" fill="#1B2A45" stroke="#5BA3FF" strokeWidth="1.2"/>
          <rect x="106" y="115" width="32" height="42" rx="6" fill="#1B2A45" stroke="#5BA3FF" strokeWidth="1.2"/>
          {/* rear */}
          <rect x="62" y="170" width="76" height="42" rx="6" fill="#1B2A45" stroke="#5BA3FF" strokeWidth="1" opacity="0.7"/>
          {/* vents (hot spots) */}
          <rect x="58" y="62" width="24" height="6" rx="2" fill="#1C69D4"/>
          <rect x="118" y="62" width="24" height="6" rx="2" fill="#1C69D4"/>
        </svg>
        {/* hot-spot buttons floating */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-130px)", top: 30, display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ background: "rgba(27,42,69,0.85)", padding: "10px 14px", borderRadius: 999, fontSize: 14, color: "#fff" }}>Steering wheel · 22°</span>
          <span style={{ background: "rgba(27,42,69,0.85)", padding: "10px 14px", borderRadius: 999, fontSize: 14, color: "#fff" }}>Driver vent · open</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Notifications screen
// ──────────────────────────────────────────────────────────
function NotificationsScreen() {
  const items = [
    { icon: "wrench", iconColor: "#F0C040", title: "High-voltage system fault", body: "Drive carefully. Visit a Service Partner.", time: "2:48 pm" },
    { icon: "door",   iconColor: "#E63946", title: "Rear-left door open", body: "Close door before driving off.", time: "2:54 pm" },
    { icon: "bolt",   iconColor: "#3CD278", title: "Charging session complete", body: "Battery at 88% · 412 km range", time: "1:30 pm" },
    { icon: "phone",  iconColor: "#5BA3FF", title: "Missed call · Anna Schmidt", body: "Tap to call back", time: "12:12 pm" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, padding: "70px 240px 110px 200px", overflow: "hidden" }}>
      <div style={{ fontSize: 14, letterSpacing: 0.06, textTransform: "uppercase", color: "#A8B5C8" }}>Notification overview</div>
      <div style={{ display: "flex", gap: 32, marginTop: 8, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ color: "#5BA3FF", fontSize: 22, paddingBottom: 14, position: "relative" }}>
          Notifications
          <span style={{ position: "absolute", left: -2, right: -2, bottom: -2, height: 3, borderRadius: 2, background: "#1C69D4", boxShadow: "0 0 12px rgba(28,105,212,0.9)" }}/>
        </span>
        <span style={{ color: "#fff", fontSize: 22, opacity: 0.7, paddingBottom: 14 }}>Check Control</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((n, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 16,
            background: "linear-gradient(180deg,#243757,#1B2A45)", borderRadius: 12,
            padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <BMWIcon name={n.icon} size={26} color={n.iconColor}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, color: "#fff" }}>{n.title}</div>
              <div style={{ fontSize: 16, color: "#A8B5C8", marginTop: 2 }}>{n.body}</div>
            </div>
            <span style={{ fontSize: 14, color: "#5C6B82" }}>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Media screen — now playing
// ──────────────────────────────────────────────────────────
function MediaScreen() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: "70px 240px 110px 200px" }}>
      <div style={{ fontSize: 14, letterSpacing: 0.06, textTransform: "uppercase", color: "#A8B5C8" }}>Media</div>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 32, marginTop: 16 }}>
        {/* now playing card with warm gradient */}
        <div style={{
          aspectRatio: "1 / 1",
          borderRadius: 16,
          background: "linear-gradient(135deg,#E25A1C,#E63946 60%,#34538D)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          padding: 16, display: "flex", flexDirection: "column", justifyContent: "flex-end",
          color: "#fff",
        }}>
          <div style={{ fontSize: 18, opacity: 0.9 }}>Spotify · Now playing</div>
          <div style={{ fontSize: 28, fontWeight: 300, marginTop: 6 }}>Highway State of Mind</div>
          <div style={{ fontSize: 16, opacity: 0.85 }}>Auto Pilot · Long Drive Vol. 2</div>
        </div>
        {/* queue / browse */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["Recently played","Sunday Drive","Lo-Fi Beats"],
            ["Made for you","Discover Weekly","Daily Mix 1"],
            ["Albums","Highway State","Long Drive Vol. 2"],
          ].map(([cat,a,b], i)=>(
            <div key={i} style={{
              background: "linear-gradient(180deg,#243757,#1B2A45)",
              borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ width: 56, height: 56, borderRadius: 8, background: i===0?"#1C69D4":i===1?"#3CD278":"#34538D" }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: "#A8B5C8", letterSpacing: 0.06, textTransform: "uppercase" }}>{cat}</div>
                <div style={{ fontSize: 20, color: "#fff" }}>{a}</div>
                <div style={{ fontSize: 16, color: "#A8B5C8" }}>{b}</div>
              </div>
              <BMWIcon name="play" size={28} color="#fff"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MapBackground, MapScreen, ClimateScreen, NotificationsScreen, MediaScreen });
