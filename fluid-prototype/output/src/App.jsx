import React from 'react';
import {
  HMIDisplay,
  HMIHeader,
  HMIFooter,
  LeftSideSlot,
  RightSideSlot,
} from './hmi/HMIChrome.jsx';
import Mapnavigationscreen from './components/Mapnavigationscreen.jsx';

const App = () => {
  return (
    <HMIDisplay>
      {/* Background: Interactive Map as full background */}
      <Mapnavigationscreen />

      {/* CHROME — IMMER vorhanden */}
      <HMIHeader />
      <LeftSideSlot />
      <RightSideSlot showPark={false} />
      <HMIFooter active="phone" />
    </HMIDisplay>
  );
};

export default App;