import { useState, useCallback, useRef, useEffect } from 'react';

const CONTACTS = [
  { id: '1', name: 'Anna Berger', number: '+49 151 2345 6789', favorite: true },
  { id: '2', name: 'Maximilian Weber', number: '+49 176 9876 5432', favorite: true },
  { id: '3', name: 'Sophie Müller', number: '+49 162 3456 7890', favorite: false },
  { id: '4', name: 'Lukas Schneider', number: '+49 170 1234 5678', favorite: true },
  { id: '5', name: 'Emma Fischer', number: '+49 157 8765 4321', favorite: false },
  { id: '6', name: 'Jonas Wagner', number: '+49 173 4567 8901', favorite: false },
  { id: '7', name: 'Lena Hoffmann', number: '+49 160 2345 6780', favorite: true },
  { id: '8', name: 'Felix Bauer', number: '+49 178 9012 3456', favorite: false },
];

export function useContacts() {
  const [contacts] = useState(CONTACTS);
  const [callState, setCallState] = useState('idle');
  const [activeContact, setActiveContact] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);

  const call = useCallback((contact) => {
    setActiveContact(contact);
    setCallState('ringing');
    setCallDuration(0);
    setTimeout(() => {
      setCallState(prev => prev === 'ringing' ? 'connected' : prev);
    }, 2000);
  }, []);

  const hangUp = useCallback(() => {
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setActiveContact(null);
      setCallDuration(0);
    }, 1500);
  }, []);

  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const formatDuration = useCallback((secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  return {
    contacts,
    favorites: contacts.filter(c => c.favorite),
    callState,
    activeContact,
    callDuration,
    callDurationFormatted: formatDuration(callDuration),
    call,
    hangUp,
  };
}
