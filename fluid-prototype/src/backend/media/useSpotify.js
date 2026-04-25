import { useState, useEffect, useRef, useCallback } from 'react';
import { spotifySearch, getNewReleases, getFallbackTracks } from '../services/spotifyService.js';

export function useSpotify() {
  const [tracks, setTracks] = useState(getFallbackTracks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const search = useCallback((query) => {
    if (!query) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    spotifySearch(query, controller.signal)
      .then(data => { if (!controller.signal.aborted) setTracks(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  }, []);

  const loadNewReleases = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    getNewReleases(controller.signal)
      .then(data => { if (!controller.signal.aborted) setTracks(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  }, []);

  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  return { tracks, search, loadNewReleases, loading, error };
}
