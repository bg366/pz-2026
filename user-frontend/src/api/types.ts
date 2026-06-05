export type FuelType = "PETROL" | "DIESEL" | "LPG" | "HYBRID" | "ELECTRIC";
export type EmissionStandard = "EURO_1" | "EURO_2" | "EURO_3" | "EURO_4" | "EURO_5" | "EURO_6" | "ELECTRIC";
export type ParkingZone = "ZONE_A" | "ZONE_B" | "ZONE_C";
export type ParkingPermission = "ALL_SPOTS" | "SCT_SPOTS_ONLY" | "NOT_ALLOWED";
export type ParkingStatus = "ACTIVE" | "INACTIVE" | "TEMPORARILY_CLOSED";

export type AuthState = {
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "USER";
  token: string;
};

export type UserVehicle = {
  id: number;
  brand: string;
  model: string;
  registrationNumber: string;
  fuelType: FuelType;
  emissionStandard: EmissionStandard;
  productionYear: number;
  vehicleType: string;
  sctCompliant: boolean;
  active: boolean;
};

export type UserVehicleRequest = {
  brand: string;
  model: string;
  registrationNumber: string;
  fuelType: FuelType;
  emissionStandard: EmissionStandard;
  productionYear: number;
  vehicleType: string;
  active: boolean;
};

export type ParkingSearchResult = {
  id: number;
  name: string;
  address: string;
  description: string | null;
  status: ParkingStatus;
  zone: ParkingZone;
  latitude: number;
  longitude: number;
  distanceKm: number;
  sctAllowed: boolean;
  availableSpots: number;
  availableRegularSpots: number;
  availableSctSpots: number;
  parkingPermission: ParkingPermission;
  permissionReason: string;
  openingHours: string;
  predictedAmount: number | null;
  predictedPricingMode: string | null;
  pricePerHour: number | null;
  currency: string | null;
  parkingType: string;
};

export type VehicleCheckResponse = {
  canEnter: boolean;
  reason: string;
};
