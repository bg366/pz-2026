export type ParkingZone = "ZONE_A" | "ZONE_B" | "ZONE_C";
export type ParkingStatus = "ACTIVE" | "INACTIVE" | "TEMPORARILY_CLOSED" | "PENDING_APPROVAL";
export type ParkingAccessType = "BARRIER" | "OPEN";
export type SpotCategory = "REGULAR" | "EV" | "DISABLED" | "SCT_READY";
export type FuelType = "PETROL" | "DIESEL" | "LPG" | "HYBRID" | "ELECTRIC";
export type UserRole = "ADMIN" | "PARKING_OWNER" | "USER";
export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";

export type AuthState = {
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  token: string;
};

export type ParkingSpot = {
  id: number;
  category: SpotCategory;
  total: number;
  occupied: number;
};

export type Price = {
  id: number;
  zone: ParkingZone | null;
  parkingLotId: number | null;
  firstHourPrice: number;
  secondHourPrice: number;
  thirdHourPrice: number;
  nextHourPrice: number;
  dailyPrice: number;
  currency: string;
};

export type ParkingLot = {
  id: number;
  name: string;
  address: string;
  description: string | null;
  status: ParkingStatus;
  zone: ParkingZone;
  latitude: number;
  longitude: number;
  totalSpots: number;
  occupiedSpots: number;
  totalSctSpots: number;
  occupiedSctSpots: number;
  openingHours: string;
  parkingType: string;
  accessType: ParkingAccessType;
  spots: ParkingSpot[];
  price: Price | null;
  ownerId: number | null;
  ownerEmail: string | null;
};

export type SctRule = {
  id: number;
  zone: ParkingZone;
  fuelType: FuelType;
  minEmissionStandard: string;
  allowed: boolean;
  validFrom: string;
  validTo: string | null;
  description: string | null;
};

export type AdminVehicle = {
  id: number;
  brand: string;
  model: string;
  registrationNumber: string;
  fuelType: string;
  emissionStandard: string;
  productionYear: number;
  vehicleType: string;
  sctCompliant: boolean;
  active: boolean;
};

export type AdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: UserRole[];
  status: UserStatus;
  vehicleCount: number;
  activeVehicleRegistration: string | null;
};

export type AdminUserDetails = Omit<AdminUser, "vehicleCount" | "activeVehicleRegistration"> & {
  vehicles: AdminVehicle[];
};

export type PasswordResetResponse = {
  userId: number;
  temporaryPassword: string;
};

export type OccupancyReport = {
  parkingLotId: number;
  parkingLotName: string;
  occupiedSpots: number;
  totalSpots: number;
  availableSpots: number;
  occupiedSctSpots: number;
  totalSctSpots: number;
  availableSctSpots: number;
  occupancyPercent: number;
  recordedAt: string;
};

export type PriceForm = {
  firstHourPrice: string;
  secondHourPrice: string;
  thirdHourPrice: string;
  nextHourPrice: string;
  dailyPrice: string;
};

export type SctRuleForm = {
  id?: number;
  zone: ParkingZone;
  fuelType: FuelType;
  minEmissionStandard: string;
  allowed: boolean;
  validFrom: string;
  validTo: string;
  description: string;
};

export type SpotFormEntry = {
  category: SpotCategory;
  total: string;
  occupied: string;
};

export type PagedResponse<T> = {
  content?: T[];
};
