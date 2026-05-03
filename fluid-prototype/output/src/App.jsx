import React, { useState } from 'react';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';
import {
  BMWCard, BMWButton, BMWIconButton, BMWSearchBar, BMWBadge,
  BMWListItem, BMWLabel, BMWDivider, BMWProgressBar, BMWToggle,
  BMWSlider, BMWScrollList, BMWInfoRow, BMWTabBar,
} from './hmi/BMWComponents.jsx';
import BMWIcon from './hmi/BMWIcons.jsx';

// ─── Nav Screen ─────────────────────────────────────────────
function NavScreen() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <BMWSearchBar
        transparent placeholder="Search"
        style={{ position: 'absolute', top: 94, left: 200, width: 360, pointerEvents: 'auto' }}
      />
      <button style={{
        position: 'absolute', top: 90, right: 280,
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(255,255,255,0.06)',
        border: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'auto',
      }}>
        <BMWIcon name="settings" size={28} color="#A8B5C8" />
      </button>
      <BMWCard style={{
        position: 'absolute', top: 160, left: 200, width: 380, pointerEvents: 'auto',
      }}>
        <BMWLabel>A9 · Highway</BMWLabel>
        <div style={{ fontSize: 28, fontWeight: 300, color: '#fff', lineHeight: 1.15, marginTop: 8 }}>AC Mer Germany GmbH</div>
        <div style={{ fontSize: 16, color: '#A8B5C8', marginTop: 6 }}>Schlossstrasse 14, 80803 Muenchen</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <BMWBadge variant="success">Available</BMWBadge>
          <BMWBadge variant="primary">22 kW</BMWBadge>
        </div>
        <BMWButton variant="primary" style={{ marginTop: 16, width: '100%' }}>Start route guidance</BMWButton>
      </BMWCard>
    </div>
  );
}

// ─── Media Screen ───────────────────────────────────────────
function MediaScreen() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <BMWCard style={{
        position: 'absolute', top: 94, left: 200, width: 440, pointerEvents: 'auto',
        background: 'linear-gradient(135deg, #2A4170 0%, #1B2A45 100%)',
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{
            width: 96, height: 96, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #1C69D4, #34538D)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BMWIcon name="music" size={44} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 300, color: '#fff' }}>Nachtmusik</div>
            <div style={{ fontSize: 16, color: '#A8B5C8', marginTop: 4 }}>Bayern Klassik</div>
            <BMWProgressBar value={35} max={100} color="#5BA3FF" style={{ marginTop: 16 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 13, color: '#5C6B82', fontVariantNumeric: 'tabular-nums' }}>1:24</span>
              <span style={{ fontSize: 13, color: '#5C6B82', fontVariantNumeric: 'tabular-nums' }}>3:58</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
          <BMWIconButton icon="forward" size={52} iconSize={22} style={{ transform: 'scaleX(-1)' }} />
          <BMWIconButton icon="play" size={64} iconSize={28} active />
          <BMWIconButton icon="forward" size={52} iconSize={22} />
        </div>
      </BMWCard>

      <div style={{
        position: 'absolute', top: 94, right: 280, width: 340, pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <BMWLabel>Up next</BMWLabel>
        <BMWListItem icon="music" iconColor="#A8B5C8" title="Autobahn" subtitle="Kraftwerk" right="22:43" />
        <BMWListItem icon="music" iconColor="#A8B5C8" title="Blue Monday" subtitle="New Order" right="7:29" />
        <BMWListItem icon="speaker" iconColor="#A8B5C8" title="Bayern 3 Live" subtitle="Radio" right="Live" />
      </div>
    </div>
  );
}

// ─── Phone Screen ───────────────────────────────────────────
function PhoneScreen() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <BMWSearchBar
        transparent placeholder="Search contacts"
        style={{ position: 'absolute', top: 94, left: 200, width: 360, pointerEvents: 'auto' }}
      />
      <div style={{
        position: 'absolute', top: 160, left: 200, width: 380, pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <BMWLabel>Recent</BMWLabel>
        <BMWListItem icon="phone" iconColor="#3CD278" title="Anna Mueller" subtitle="Mobile · 2 min ago" showChevron />
        <BMWListItem icon="phone" iconColor="#5BA3FF" title="BMW Service" subtitle="Landline · Yesterday" showChevron />
        <BMWListItem icon="phone" iconColor="#E63946" title="Max Schmidt" subtitle="Mobile · Missed" showChevron />
      </div>
    </div>
  );
}

// ─── Home Screen ────────────────────────────────────────────
function HomeScreen() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Center vehicle status */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        pointerEvents: 'auto',
      }}>
        <img src="/bmw-hmi/bmw-roundel.png" width={64} height={64} alt="BMW" style={{ borderRadius: '50%' }} />
        <div style={{ fontSize: 32, fontWeight: 300, color: '#fff', textAlign: 'center' }}>BMW iX xDrive50</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 56, fontWeight: 100, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>245</span>
          <span style={{ fontSize: 18, color: '#A8B5C8' }}>km range</span>
        </div>
        <BMWProgressBar value={72} max={100} color="#3CD278" height={6} style={{ width: 280 }} />
        <div style={{ fontSize: 16, color: '#A8B5C8', marginTop: -4 }}>72% · Charging complete</div>
      </div>

      {/* Notifications — top right */}
      <div style={{
        position: 'absolute', top: 94, right: 280, width: 340, pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <BMWListItem icon="wrench" iconColor="#F0C040" title="Service in 1,200 km" subtitle="Schedule appointment" />
        <BMWListItem icon="triangleAlert" iconColor="#E63946" title="Tyre pressure low" subtitle="Front left: 1.8 bar" />
      </div>
    </div>
  );
}

// ─── Climate Screen ─────────────────────────────────────────
function ClimateScreen() {
  const [driverTemp] = useState(20.0);
  const [fanSpeed, setFanSpeed] = useState(3);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <BMWCard style={{
        position: 'absolute', top: 94, left: 200, width: 400, pointerEvents: 'auto',
      }}>
        <BMWLabel style={{ marginBottom: 16 }}>Climate</BMWLabel>
        <BMWInfoRow icon="bolt" label="Interior" value={`${driverTemp.toFixed(1)} °C`} />
        <BMWInfoRow icon="fan" label="Exterior" value="23.0 °C" />
        <BMWDivider spacing={12} />
        <BMWLabel style={{ marginBottom: 12 }}>Fan speed</BMWLabel>
        <BMWSlider value={fanSpeed} min={0} max={7} onChange={setFanSpeed} showValue />
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <BMWButton variant="secondary" style={{ flex: 1 }}>A/C Off</BMWButton>
          <BMWButton variant="primary" style={{ flex: 1 }}>Auto</BMWButton>
        </div>
      </BMWCard>
    </div>
  );
}

// ─── Car Screen ─────────────────────────────────────────────
function CarScreen() {
  const [parkAssist, setParkAssist] = useState(true);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <BMWCard style={{
        position: 'absolute', top: 94, left: 200, width: 400, pointerEvents: 'auto',
      }}>
        <BMWLabel style={{ marginBottom: 16 }}>Vehicle</BMWLabel>
        <BMWInfoRow icon="bolt" label="Range" value="245 km" />
        <BMWInfoRow icon="charge" label="Battery" value="72%" />
        <BMWInfoRow icon="car" label="Odometer" value="12,450 km" />
        <BMWInfoRow icon="wrench" label="Next service" value="1,200 km" style={{ borderBottom: 'none' }} />
      </BMWCard>
      <BMWCard style={{
        position: 'absolute', top: 350, left: 200, width: 400, pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, color: '#fff' }}>Park assist</span>
          <BMWToggle checked={parkAssist} onChange={setParkAssist} />
        </div>
      </BMWCard>
      <div style={{
        position: 'absolute', top: 94, right: 280, width: 340, pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <BMWLabel>Tyre pressure</BMWLabel>
        <BMWCard>
          <BMWInfoRow label="Front left" value={<span style={{ color: '#E63946' }}>1.8 bar</span>} />
          <BMWInfoRow label="Front right" value="2.4 bar" />
          <BMWInfoRow label="Rear left" value="2.3 bar" />
          <BMWInfoRow label="Rear right" value="2.4 bar" style={{ borderBottom: 'none' }} />
        </BMWCard>
      </div>
    </div>
  );
}

// ─── Apps Screen ────────────────────────────────────────────
function AppsScreen() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', top: 94, left: 200, pointerEvents: 'auto',
        display: 'flex', gap: 16, flexWrap: 'wrap', width: 500,
      }}>
        <BMWIconButton icon="pin" label="Maps" size={88} iconSize={32} />
        <BMWIconButton icon="music" label="Music" size={88} iconSize={32} />
        <BMWIconButton icon="phone" label="Phone" size={88} iconSize={32} />
        <BMWIconButton icon="speaker" label="Radio" size={88} iconSize={32} />
        <BMWIconButton icon="charge" label="Charging" size={88} iconSize={32} />
        <BMWIconButton icon="bolt" label="Trips" size={88} iconSize={32} />
        <BMWIconButton icon="shield" label="Safety" size={88} iconSize={32} />
        <BMWIconButton icon="camera" label="Camera" size={88} iconSize={32} />
        <BMWIconButton icon="settings" label="Settings" size={88} iconSize={32} />
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────
const App = () => {
  const [screen, setScreen] = useState('home');

  return (
    <HMIDisplay>
      <MapBackground />

      {screen === 'home'  && <HomeScreen />}
      {screen === 'media' && <MediaScreen />}
      {screen === 'nav'   && <NavScreen />}
      {screen === 'phone' && <PhoneScreen />}
      {screen === 'fan'   && <ClimateScreen />}
      {screen === 'car'   && <CarScreen />}
      {screen === 'apps'  && <AppsScreen />}

      <HMIHeader />
      <LeftSideSlot />
      <RightSideSlot showPark={screen === 'nav'} />
      <HMIFooter active={screen} onTab={setScreen} />
    </HMIDisplay>
  );
};

export default App;
