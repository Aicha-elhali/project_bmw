## Climate Control

### hooks/useClimateControl.js
Hook: `useClimateControl()`
Returns: `{ driverTemp, passengerTemp, fanSpeed, acOn, seatHeatingDriver, seatHeatingPassenger, autoMode, setDriverTemp(v), setPassengerTemp(v), setFanSpeed(v), toggleAC(), setSeatHeatingDriver(v), setSeatHeatingPassenger(v), toggleAuto() }`
Pure React state. Temp range 16-28°C, fan 0-5, seat heating 0-3.
