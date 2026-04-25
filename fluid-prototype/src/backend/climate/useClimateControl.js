import { useState, useCallback } from 'react';

export function useClimateControl() {
  const [driverTemp, setDriverTemp] = useState(22);
  const [passengerTemp, setPassengerTemp] = useState(22);
  const [fanSpeed, setFanSpeed] = useState(2);
  const [acOn, setAcOn] = useState(true);
  const [seatHeatingDriver, setSeatHeatingDriver] = useState(0);
  const [seatHeatingPassenger, setSeatHeatingPassenger] = useState(0);
  const [autoMode, setAutoMode] = useState(false);

  const clampTemp = (v) => Math.max(16, Math.min(28, v));
  const clampFan = (v) => Math.max(0, Math.min(5, v));
  const clampSeat = (v) => Math.max(0, Math.min(3, v));

  return {
    driverTemp,
    passengerTemp,
    fanSpeed,
    acOn,
    seatHeatingDriver,
    seatHeatingPassenger,
    autoMode,
    setDriverTemp: useCallback((v) => setDriverTemp(clampTemp(v)), []),
    setPassengerTemp: useCallback((v) => setPassengerTemp(clampTemp(v)), []),
    setFanSpeed: useCallback((v) => setFanSpeed(clampFan(v)), []),
    toggleAC: useCallback(() => setAcOn(v => !v), []),
    setSeatHeatingDriver: useCallback((v) => setSeatHeatingDriver(clampSeat(v)), []),
    setSeatHeatingPassenger: useCallback((v) => setSeatHeatingPassenger(clampSeat(v)), []),
    toggleAuto: useCallback(() => setAutoMode(v => !v), []),
  };
}
