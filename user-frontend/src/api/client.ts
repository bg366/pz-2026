import type { AuthState, UserVehicle, UserVehicleRequest, ParkingSearchResult, VehicleCheckResponse, Reservation, ReservationRequest, AppNotification, OwnerParkingCreateRequest, OwnerParkingLot, PriceForm, ParkingSession, StartSessionRequest } from "./types";

export const AUTH_STORAGE_KEY = "krakow-parking-user-auth";

export function readStoredAuth(): AuthState | null {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const auth = stored ? (JSON.parse(stored) as AuthState) : null;
    if (auth && auth.token.split(".").length !== 3) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return auth;
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
  return { Authorization: `Bearer ${getToken()}` };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => `HTTP ${response.status}`);
    let parsed: { message?: string; errors?: string[] } | null = null;
    try {
      parsed = JSON.parse(text) as { message?: string; errors?: string[] };
    } catch {
      parsed = null;
    }
    if (parsed) {
      const details = Array.isArray(parsed.errors) && parsed.errors.length > 0 ? ` ${parsed.errors.join(", ")}` : "";
      throw new Error(`${parsed.message ?? `Błąd HTTP ${response.status}`}${details}`);
    }
    if (text.includes("Data integrity violation")) {
      throw new Error("Nie udało się zapisać danych. Sprawdź formularz i spróbuj ponownie.");
    }
    throw new Error(text || `Błąd HTTP ${response.status}`);
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

type ProfilePayload = Pick<AuthState, "email" | "firstName" | "lastName" | "roles">;

export async function updateProfile(firstName: string, lastName: string): Promise<ProfilePayload> {
  const response = await fetch("/api/me", {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName })
  });
  return handleResponse<ProfilePayload>(response);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<AuthState> {
  const response = await fetch("/api/me/password", {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
  });
  return handleResponse<AuthState>(response);
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

export async function initiatePayment(token: string): Promise<{ status: string; redirectUrl: string | null }> {
  const response = await fetch(`/api/me/payments/${token}/initiate`, {
    method: "POST",
    headers: authHeaders()
  });
  return handleResponse<{ status: string; redirectUrl: string | null }>(response);
}

export async function confirmPayment(token: string): Promise<{ status: string }> {
  const response = await fetch(`/api/me/payments/${token}/confirm`, {
    method: "POST",
    headers: authHeaders()
  });
  return handleResponse<{ status: string }>(response);
}

export async function cancelPayment(token: string): Promise<{ status: string }> {
  const response = await fetch(`/api/me/payments/${token}/cancel`, {
    method: "POST",
    headers: authHeaders()
  });
  return handleResponse<{ status: string }>(response);
}

export async function getAllActiveParkings(): Promise<ParkingSearchResult[]> {
  return searchParkings({ lat: "50.0615", lng: "19.9370", radiusKm: "50" });
}

// --- Owner ---

export async function getOwnerParkingLots(): Promise<OwnerParkingLot[]> {
  const response = await fetch("/api/owner/parking-lots", { headers: authHeaders() });
  return handleResponse<OwnerParkingLot[]>(response);
}

export async function createOwnerParkingLot(data: OwnerParkingCreateRequest): Promise<OwnerParkingLot> {
  const response = await fetch("/api/owner/parking-lots", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return handleResponse<OwnerParkingLot>(response);
}

export async function updateOwnerOccupancy(id: number, occupiedSpots: number): Promise<OwnerParkingLot> {
  const response = await fetch(`/api/owner/parking-lots/${id}/occupancy`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ occupiedSpots })
  });
  return handleResponse<OwnerParkingLot>(response);
}

export async function updateOwnerSpots(
  id: number,
  spots: { category: string; total: number; occupied: number }[]
): Promise<OwnerParkingLot> {
  const response = await fetch(`/api/owner/parking-lots/${id}/spots`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(spots)
  });
  return handleResponse<OwnerParkingLot>(response);
}

export async function updateOwnerParkingPrice(id: number, form: PriceForm): Promise<OwnerParkingLot["price"]> {
  const response = await fetch(`/api/owner/parking-lots/${id}/price`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      firstHourPrice: Number(form.firstHourPrice),
      secondHourPrice: Number(form.secondHourPrice),
      thirdHourPrice: Number(form.thirdHourPrice),
      nextHourPrice: Number(form.nextHourPrice),
      dailyPrice: Number(form.dailyPrice)
    })
  });
  return handleResponse<OwnerParkingLot["price"]>(response);
}

// --- Notifications ---

export async function getNotifications(): Promise<AppNotification[]> {
  const response = await fetch("/api/me/notifications", { headers: authHeaders() });
  return handleResponse<AppNotification[]>(response);
}

export async function markNotificationRead(id: number): Promise<AppNotification> {
  const response = await fetch(`/api/me/notifications/${id}/read`, {
    method: "PATCH",
    headers: authHeaders()
  });
  return handleResponse<AppNotification>(response);
}

// --- Parking sessions (OPEN parking) ---

export async function getParkingSessions(): Promise<ParkingSession[]> {
  const response = await fetch("/api/me/parking-sessions", { headers: authHeaders() });
  return handleResponse<ParkingSession[]>(response);
}

export async function startParkingSession(data: StartSessionRequest): Promise<ParkingSession> {
  const response = await fetch("/api/me/parking-sessions", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return handleResponse<ParkingSession>(response);
}

export async function initiateSessionPayment(token: string): Promise<{ redirectUrl?: string }> {
  const response = await fetch(`/api/me/parking-sessions/initiate/${token}`, {
    method: "POST",
    headers: authHeaders()
  });
  return handleResponse<{ redirectUrl?: string }>(response);
}

export async function requestSessionPayment(sessionId: number): Promise<ParkingSession> {
  const response = await fetch(`/api/me/parking-sessions/${sessionId}/pay`, {
    method: "POST",
    headers: authHeaders()
  });
  return handleResponse<ParkingSession>(response);
}

export async function confirmSessionPayment(token: string): Promise<ParkingSession> {
  const response = await fetch(`/api/me/parking-sessions/confirm/${token}`, {
    method: "POST",
    headers: authHeaders()
  });
  return handleResponse<ParkingSession>(response);
}

export async function cancelParkingSession(sessionId: number): Promise<ParkingSession> {
  const response = await fetch(`/api/me/parking-sessions/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  return handleResponse<ParkingSession>(response);
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
