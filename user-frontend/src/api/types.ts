export type FuelType = "PETROL" | "DIESEL" | "LPG" | "HYBRID" | "ELECTRIC";
export type EmissionStandard = "EURO_1" | "EURO_2" | "EURO_3" | "EURO_4" | "EURO_5" | "EURO_6" | "ELECTRIC";
export type ParkingZone = "ZONE_A" | "ZONE_B" | "ZONE_C";
export type ParkingPermission = "ALL_SPOTS" | "SCT_SPOTS_ONLY" | "NOT_ALLOWED";
export type ParkingStatus = "ACTIVE" | "INACTIVE" | "TEMPORARILY_CLOSED" | "PENDING_APPROVAL";
export type ParkingAccessType = "BARRIER" | "OPEN";

export type AuthState = {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
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
  accessType: ParkingAccessType;
};

export type VehicleCheckResponse = {
  canEnter: boolean;
  reason: string;
};

export type ReservationStatus = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "EXPIRED";

export type Reservation = {
  id: number;
  parkingLotId: number;
  parkingLotName: string;
  parkingLotAddress: string;
  status: ReservationStatus;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  estimatedAmount: number | null;
  currency: string | null;
  pricingMode: string | null;
  paymentToken: string | null;
};

export type ReservationRequest = {
  parkingLotId: number;
  startsAt: string;
  endsAt: string;
};

export type OwnerParkingSpot = {
  id: number;
  category: string;
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

export type PriceForm = {
  firstHourPrice: string;
  secondHourPrice: string;
  thirdHourPrice: string;
  nextHourPrice: string;
  dailyPrice: string;
};

export type OwnerParkingLot = {
  id: number;
  name: string;
  address: string;
  status: ParkingStatus;
  zone: ParkingZone;
  totalSpots: number;
  occupiedSpots: number;
  totalSctSpots: number;
  occupiedSctSpots: number;
  openingHours: string;
  parkingType: string;
  spots: OwnerParkingSpot[];
  price: Price | null;
};

export type OwnerParkingCreateRequest = {
  name: string;
  address: string;
  description: string | null;
  zone: ParkingZone;
  latitude: number;
  longitude: number;
  totalSpots: number;
  totalSctSpots: number;
  openingHours: string;
  parkingType: string;
  accessType: ParkingAccessType;
};

export type NotificationType = "RESERVATION_EXPIRING" | "RESERVATION_EXPIRED" | "RESERVATION_CONFIRMED";

export type AppNotification = {
  id: number;
  type: NotificationType;
  message: string;
  read: boolean;
  reservationId: number | null;
  createdAt: string;
};

export type ParkingSessionStatus = "ACTIVE" | "PAYMENT_PENDING" | "PAID" | "CANCELLED";

export type ParkingSession = {
  id: number;
  parkingLotId: number;
  parkingLotName: string;
  parkingLotAddress: string;
  registrationNumber: string;
  startedAt: string;
  endedAt: string | null;
  status: ParkingSessionStatus;
  amount: number | null;
  currency: string | null;
  paymentToken: string | null;
};

export type StartSessionRequest = {
  parkingLotId: number;
  registrationNumber: string;
  plannedEndAt?: string;
};
