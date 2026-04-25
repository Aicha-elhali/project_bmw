## Vehicle Data

### hooks/useVehicleData.js
Hook: `useVehicleData()`
Returns: `{ range, battery, speed, odometer, avgConsumption, outsideTemp, isCharging }`
Updates every second with simulated drift.

### services/vehicleService.js
- `createVehicleSimulation(): { getState(), tick() }`
