import { useState, useEffect, useRef } from 'react';
import { createVehicleSimulation } from '../services/vehicleService.js';

export function useVehicleData() {
  const simRef = useRef(null);
  if (!simRef.current) simRef.current = createVehicleSimulation();

  const [data, setData] = useState(() => simRef.current.getState());

  useEffect(() => {
    const id = setInterval(() => {
      setData(simRef.current.tick());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return data;
}
