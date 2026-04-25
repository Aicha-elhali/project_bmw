import { useState, useEffect } from 'react';

function formatTime() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function useStatusBar() {
  const [time, setTime] = useState(formatTime);
  const [signal] = useState(4);
  const [network] = useState('5G');
  const [bluetooth] = useState(true);
  const [wifi] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(id);
  }, []);

  return { time, signal, network, bluetooth, wifi };
}
