import React from 'react';
import { HMIDisplay, HMIHeader, HMIFooter, LeftSideSlot, RightSideSlot } from './hmi/HMIChrome.jsx';
import { NavigationProvider } from './context/NavigationContext.jsx';
import Mapnavigationscreen from './components/Mapnavigationscreen.jsx';

const App = () => {
  return (
    <NavigationProvider>
      <HMIDisplay>
        {/* Map as full background — replaces MapBackground for interactive map */}
        <Mapnavigationscreen />

        {/* CHROME — always present */}
        <HMIHeader />
        <LeftSideSlot />
        <RightSideSlot showPark={false} />
        <HMIFooter active="nav" />
      </HMIDisplay>
    </NavigationProvider>
  );
};

export default App;