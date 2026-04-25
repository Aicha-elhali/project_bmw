import React from 'react';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot, MapBackground } from './hmi/HMIChrome.jsx';
import { StatusBarProvider } from './context/StatusBarContext.jsx';
import Screen from './components/Screen.jsx';

const App = () => {
  return (
    <StatusBarProvider>
      <HMIDisplay>
        {/* Background: Map for this call screen */}
        <MapBackground />

        {/* CONTENT — position absolute, with padding for chrome zones */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: '70px 280px 110px 240px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
          <Screen />
        </div>

        {/* CHROME — always present */}
        <HMIHeader />
        <LeftSideSlot />
        <RightSideSlot showPark={false} />
        <HMIFooter active="phone" />
      </HMIDisplay>
    </StatusBarProvider>
  );
};

export default App;