import type { Catalog } from './types';

export const defaultVehicleSpecs = {
  body: 'All-electric, two-door 2+2 coupe',
  seats: 4,
  batteryGross: 77,
  batteryUsable: 72,
  voltage: 400,
  dcKW: 185,
  acKW: 11.5,
  connector: 'SAE J3400 / NACS',
  fastChargeMinutes: '27–30',
  centerDisplay: 14,
  driverDisplay: 10.25,
};
export function vehicleSpecs(catalog: Catalog) {
  return { ...defaultVehicleSpecs, ...catalog.vehicle.specs };
}
