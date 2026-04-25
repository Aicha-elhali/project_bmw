import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { calculateRoute } from '../services/navigationService.js';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [position] = useState({ lat: 48.1351, lon: 11.5820 });
  const [destination, setDestinationState] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const setDestination = useCallback((dest) => {
    setDestinationState(dest);
  }, []);

  const clearRoute = useCallback(() => {
    setDestinationState(null);
    setRoute(null);
  }, []);

  useEffect(() => {
    if (!destination) { setRoute(null); return; }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    calculateRoute(position, destination, controller.signal)
      .then(r => { if (!controller.signal.aborted) setRoute(r); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [destination, position]);

  return (
    <NavigationContext.Provider value={{ position, destination, route, loading, setDestination, clearRoute }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
}
