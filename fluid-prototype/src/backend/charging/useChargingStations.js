import { useState, useEffect, useRef, useCallback } from 'react';
import { getNearbyStations } from '../services/chargingService.js';

export function useChargingStations(lat = 48.1351, lon = 11.582, radius = 10) {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    getNearbyStations(lat, lon, radius, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setStations(data);
          setError(null);
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [lat, lon, radius]);

  const selectStation = useCallback((station) => setSelectedStation(station), []);

  return { stations, loading, error, selectedStation, selectStation };
}
