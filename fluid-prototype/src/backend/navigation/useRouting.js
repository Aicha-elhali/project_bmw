import { useState, useEffect, useRef } from 'react';
import { calculateRoute } from '../services/navigationService.js';

export function useRouting(origin, destination) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    calculateRoute(origin, destination, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setRoute(data);
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
  }, [origin?.lat, origin?.lon, destination?.lat, destination?.lon]);

  return { route, loading, error };
}
