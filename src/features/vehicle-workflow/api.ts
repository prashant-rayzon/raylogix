import { VehicleLookupResult } from './types';

const normalizeVehicleNumber = (value: string) =>
  value.replace(/[^A-Z0-9]/gi, '').toUpperCase();

const getSeed = (value: string) =>
  normalizeVehicleNumber(value).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

export async function fetchVehicleLookup(vehicleNumber: string): Promise<VehicleLookupResult> {
  const normalized = normalizeVehicleNumber(vehicleNumber);
  const seed = getSeed(normalized);

  // Frontend-safe mock. Replace this with a backend endpoint like:
  // POST /api/admin/vehicle-lookup { vehicleNumber }
  // The backend should call the provider securely and return normalized data only.
  await new Promise(resolve => window.setTimeout(resolve, 500));

  return {
    vehicleNumber: normalized,
    ownerName: seed % 2 === 0 ? 'Rayzon Solar Fleet' : 'Partner Transport Ops',
    vehicleType: seed % 3 === 0 ? 'Excavator Carrier' : 'Open Truck',
    registrationStatus: seed % 5 === 0 ? 'warning' : 'active',
    permitStatus: seed % 4 === 0 ? 'expiring' : 'valid',
    insuranceStatus: seed % 6 === 0 ? 'expiring' : 'valid',
    lastUpdated: new Date().toISOString(),
  };
}
