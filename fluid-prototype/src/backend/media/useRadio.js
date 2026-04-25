import { useState, useEffect, useRef, useCallback } from 'react';
import { getTopStations, searchStations, getFallbackStations } from '../services/radioService.js';

export function useRadio() {
  const [stations, setStations] = useState(getFallbackStations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const loadTop = useCallback((country = 'DE') => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    getTopStations(country, 10, controller.signal)
      .then(data => { if (!controller.signal.aborted) setStations(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  }, []);

  const search = useCallback((query) => {
    if (!query) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    searchStations(query, 10, controller.signal)
      .then(data => { if (!controller.signal.aborted) setStations(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  }, []);

  useEffect(() => { loadTop(); }, [loadTop]);
  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  return { stations, search, loadTop, loading, error };
}
