import type { AuthState, UserVehicle, UserVehicleRequest, ParkingSearchResult, VehicleCheckResponse, Reservation, ReservationRequest } from "./types";

export const AUTH_STORAGE_KEY = "krakow-parking-user-auth";

export function readStoredAuth(): AuthState | null {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthState) : null;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveAuth(auth: AuthState): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getToken(): string {
  const auth = readStoredAuth();
  return auth?.token ?? "";
}

function authHeaders(): HeadersInit {
  return { Authorization: `Basic ${getToken()}` };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// --- Auth ---

export async function login(email: string, password: string): Promise<AuthState> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return handleResponse<AuthState>(response);
}

export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<AuthState> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, password })
  });
  return handleResponse<AuthState>(response);
}

// --- Profile ---

type ProfilePayload = Pick<AuthState, "email" | "firstName" | "lastName" | "role">;

export async function updateProfile(firstName: string, lastName: string): Promise<ProfilePayload> {
  const response = await fetch("/api/me", {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName })
  });
  return handleResponse<ProfilePayload>(response);
}

// --- Vehicles ---

export async function getVehicles(): Promise<UserVehicle[]> {
  const response = await fetch("/api/me/vehicles", { headers: authHeaders() });
  return handleResponse<UserVehicle[]>(response);
}

export async function addVehicle(data: UserVehicleRequest): Promise<UserVehicle> {
  const response = await fetch("/api/me/vehicles", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return handleResponse<UserVehicle>(response);
}

export async function updateVehicle(id: number, data: UserVehicleRequest): Promise<UserVehicle> {
  const response = await fetch(`/api/me/vehicles/${id}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return handleResponse<UserVehicle>(response);
}

export async function deleteVehicle(id: number): Promise<void> {
  const response = await fetch(`/api/me/vehicles/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export async function setActiveVehicle(id: number): Promise<void> {
  const response = await fetch(`/api/me/vehicles/${id}/active`, {
    method: "PATCH",
    headers: authHeaders()
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

// --- Parking search ---

export type ParkingSearchParams = {
  lat: string;
  lng: string;
  radiusKm: string;
  name?: string;
  zone?: string;
  maxPricePerHour?: string;
  durationMinutes?: string;
  onlyAvailable?: boolean;
  openNow?: boolean;
  sort?: string;
  fuelType?: string;
  emissionStandard?: string;
};

export async function searchParkings(params: ParkingSearchParams): Promise<ParkingSearchResult[]> {
  const query = new URLSearchParams({ lat: params.lat, lng: params.lng, radiusKm: params.radiusKm });
  if (params.name) query.set("name", params.name);
  if (params.zone) query.set("zone", params.zone);
  if (params.maxPricePerHour) query.set("maxPricePerHour", params.maxPricePerHour);
  if (params.durationMinutes) query.set("durationMinutes", params.durationMinutes);
  if (params.onlyAvailable) query.set("onlyAvailable", "true");
  if (params.openNow) query.set("openNow", "true");
  if (params.sort) query.set("sort", params.sort);
  if (params.fuelType) query.set("fuelType", params.fuelType);
  if (params.emissionStandard) query.set("emissionStandard", params.emissionStandard);

  const response = await fetch(`/api/parking-lots/search?${query.toString()}`);
  return handleResponse<ParkingSearchResult[]>(response);
}

// --- Reservations ---

export async function getReservations(): Promise<Reservation[]> {
  const response = await fetch("/api/me/reservations", { headers: authHeaders() });
  return handleResponse<Reservation[]>(response);
}

export async function createReservation(data: ReservationRequest): Promise<Reservation> {
  const response = await fetch("/api/me/reservations", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return handleResponse<Reservation>(response);
}

export async function cancelReservation(id: number): Promise<Reservation> {
  const response = await fetch(`/api/me/reservations/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  return handleResponse<Reservation>(response);
}

// --- Vehicle check (SCT) ---

export type VehicleCheckRequest = {
  registrationNumber: string | null;
  fuelType: string | null;
  emissionStandard: string | null;
  zone: string;
};

export async function checkVehicle(request: VehicleCheckRequest): Promise<VehicleCheckResponse> {
  const response = await fetch("/api/vehicles/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  return handleResponse<VehicleCheckResponse>(response);
}
