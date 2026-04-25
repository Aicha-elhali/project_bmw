import { useState, useEffect, useRef } from 'react';
import { getCurrentWeather } from '../services/weatherService.js';

export function useWeather(lat = 48.1351, lon = 11.582) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    let intervalId;

    function fetchWeather() {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      getCurrentWeather(lat, lon, controller.signal)
        .then(result => {
          if (!controller.signal.aborted) {
            setData(result);
            setError(null);
            setLoading(false);
          }
        })
        .catch(err => {
          if (!controller.signal.aborted) {
            setError(err.message);
            setLoading(false);
          }
        });
    }

    fetchWeather();
    intervalId = setInterval(fetchWeather, 15 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [lat, lon]);

  return { ...data, loading, error };
}
