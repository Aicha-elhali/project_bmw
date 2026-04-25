import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getFallbackTracks } from '../services/spotifyService.js';
import { getFallbackStations } from '../services/radioService.js';

const MediaContext = createContext(null);

export function MediaProvider({ children }) {
  const audioRef = useRef(null);
  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
  }

  const [source, setSourceState] = useState('spotify');
  const [currentTrack, setCurrentTrack] = useState(getFallbackTracks()[0]);
  const [currentStation, setCurrentStation] = useState(getFallbackStations()[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const play = useCallback((url) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (url) {
      audio.src = url;
      audio.load();
    }
    audio.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const setSource = useCallback((src) => {
    pause();
    setSourceState(src);
    setProgress(0);
  }, [pause]);

  const playTrack = useCallback((track) => {
    setCurrentTrack(track);
    setSourceState('spotify');
    setDuration(track.duration || 30);
    if (track.previewUrl) play(track.previewUrl);
    else setIsPlaying(false);
  }, [play]);

  const playStation = useCallback((station) => {
    setCurrentStation(station);
    setSourceState('radio');
    setDuration(0);
    if (station.url) play(station.url);
    else setIsPlaying(false);
  }, [play]);

  return (
    <MediaContext.Provider value={{
      source, currentTrack, currentStation, isPlaying, progress, duration,
      play, pause, seek, setSource, playTrack, playStation,
    }}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const ctx = useContext(MediaContext);
  if (!ctx) throw new Error('useMedia must be used within MediaProvider');
  return ctx;
}
