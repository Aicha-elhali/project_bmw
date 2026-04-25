const INITIAL = {
  range: 245,
  battery: 72,
  speed: 85,
  odometer: 34521,
  avgConsumption: 16.8,
  outsideTemp: 21,
  isCharging: false,
};

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function drift(value, amount, min, max) {
  return clamp(value + (Math.random() - 0.5) * 2 * amount, min, max);
}

export function createVehicleSimulation() {
  let state = { ...INITIAL };

  return {
    getState() { return { ...state }; },

    tick() {
      state.speed = drift(state.speed, 2, 0, 220);
      state.outsideTemp = drift(state.outsideTemp, 0.1, -10, 45);
      state.range = drift(state.range, 0.3, 0, 500);
      state.battery = clamp((state.range / 340) * 100, 0, 100);
      state.avgConsumption = drift(state.avgConsumption, 0.2, 10, 30);
      state.odometer += state.speed / 3600;
      return { ...state };
    },
  };
}
