import type {
  ParkingLot,
  SctRule,
  AdminUser,
  AdminUserDetails,
  OccupancyReport,
  PasswordResetResponse,
  UserRole,
  UserStatus,
  PagedResponse,
  PriceForm,
  SctRuleForm
} from "./types";
import type { ParkingLotPayload } from "../components/ParkingLotForm";

export const AUTH_STORAGE_KEY = "krakow-parking-admin-auth";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function makeHeaders(token: string, extra?: Record<string, string>): HeadersInit {
  return { Authorization: `Bearer ${token}`, ...extra };
}

export function normalizeParkingLots(payload: ParkingLot[] | PagedResponse<ParkingLot>): ParkingLot[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.content) ? payload.content : [];
}

// --- Parking lots ---

export async function getParkingLots(token: string): Promise<ParkingLot[]> {
  const response = await fetch("/api/admin/parking-lots?size=100&sort=id,asc", { headers: makeHeaders(token) });
  const payload = await handleResponse<ParkingLot[] | PagedResponse<ParkingLot>>(response);
  return normalizeParkingLots(payload).sort((a, b) => a.id - b.id);
}

export async function getParkingLot(id: number, token: string): Promise<ParkingLot> {
  const response = await fetch(`/api/admin/parking-lots/${id}`, { headers: makeHeaders(token) });
  return handleResponse<ParkingLot>(response);
}

export async function saveParkingLot(payload: ParkingLotPayload, token: string): Promise<ParkingLot> {
  const isEdit = payload.id != null;
  const url = isEdit ? `/api/admin/parking-lots/${payload.id}` : "/api/admin/parking-lots";
  const response = await fetch(url, {
    method: isEdit ? "PUT" : "POST",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      name: payload.name,
      address: payload.address,
      description: payload.description || null,
      status: payload.status,
      zone: payload.zone,
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
      totalSpots: Number(payload.totalSpots),
      occupiedSpots: payload.occupiedSpots,
      totalSctSpots: Number(payload.totalSctSpots),
      occupiedSctSpots: payload.occupiedSctSpots,
      openingHours: payload.openingHours,
      parkingType: payload.parkingType
    })
  });
  return handleResponse<ParkingLot>(response);
}

export async function deleteParkingLot(id: number, token: string): Promise<void> {
  const response = await fetch(`/api/admin/parking-lots/${id}`, {
    method: "DELETE",
    headers: makeHeaders(token)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

export async function updateOccupancy(id: number, occupiedSpots: number, token: string): Promise<ParkingLot> {
  const response = await fetch(`/api/admin/parking-lots/${id}/occupancy`, {
    method: "PATCH",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ occupiedSpots })
  });
  return handleResponse<ParkingLot>(response);
}

export async function updateSpots(
  id: number,
  spots: { category: string; total: number; occupied: number }[],
  token: string
): Promise<ParkingLot> {
  const response = await fetch(`/api/admin/parking-lots/${id}/spots`, {
    method: "PUT",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(spots)
  });
  return handleResponse<ParkingLot>(response);
}

export async function updateParkingLotPrice(
  id: number,
  form: PriceForm,
  token: string
): Promise<unknown> {
  const response = await fetch(`/api/admin/parking-lots/${id}/price`, {
    method: "PUT",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      firstHourPrice: Number(form.firstHourPrice),
      secondHourPrice: Number(form.secondHourPrice),
      thirdHourPrice: Number(form.thirdHourPrice),
      nextHourPrice: Number(form.nextHourPrice),
      dailyPrice: Number(form.dailyPrice)
    })
  });
  return handleResponse(response);
}

export async function updateZonePrice(
  zone: string,
  form: PriceForm,
  token: string
): Promise<unknown> {
  const response = await fetch(`/api/admin/prices/zones/${zone}`, {
    method: "PUT",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      firstHourPrice: Number(form.firstHourPrice),
      secondHourPrice: Number(form.secondHourPrice),
      thirdHourPrice: Number(form.thirdHourPrice),
      nextHourPrice: Number(form.nextHourPrice),
      dailyPrice: Number(form.dailyPrice)
    })
  });
  return handleResponse(response);
}

export async function assignParkingLotOwner(
  id: number,
  ownerId: number | null,
  token: string
): Promise<ParkingLot> {
  const response = await fetch(`/api/admin/parking-lots/${id}/owner`, {
    method: "PATCH",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ ownerId })
  });
  return handleResponse<ParkingLot>(response);
}

// --- SCT rules ---

export async function getSctRules(token: string): Promise<SctRule[]> {
  const response = await fetch("/api/admin/sct-rules", { headers: makeHeaders(token) });
  return handleResponse<SctRule[]>(response);
}

export async function saveSctRule(form: SctRuleForm, token: string): Promise<SctRule> {
  const method = form.id ? "PUT" : "POST";
  const path = form.id ? `/api/admin/sct-rules/${form.id}` : "/api/admin/sct-rules";
  const response = await fetch(path, {
    method,
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      zone: form.zone,
      fuelType: form.fuelType,
      minEmissionStandard: form.minEmissionStandard,
      allowed: form.allowed,
      validFrom: form.validFrom,
      validTo: form.validTo || null,
      description: form.description || null
    })
  });
  return handleResponse<SctRule>(response);
}

export async function deleteSctRule(id: number, token: string): Promise<void> {
  const response = await fetch(`/api/admin/sct-rules/${id}`, {
    method: "DELETE",
    headers: makeHeaders(token)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

// --- Users ---

export async function getUsers(token: string): Promise<AdminUser[]> {
  const response = await fetch("/api/admin/users", { headers: makeHeaders(token) });
  return handleResponse<AdminUser[]>(response);
}

export async function getUserDetails(id: number, token: string): Promise<AdminUserDetails> {
  const response = await fetch(`/api/admin/users/${id}`, { headers: makeHeaders(token) });
  return handleResponse<AdminUserDetails>(response);
}

export async function updateUserRole(id: number, roles: UserRole[], token: string): Promise<AdminUserDetails> {
  const response = await fetch(`/api/admin/users/${id}/role`, {
    method: "PATCH",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ roles })
  });
  return handleResponse<AdminUserDetails>(response);
}

export async function updateUserStatus(id: number, status: UserStatus, token: string): Promise<AdminUserDetails> {
  const response = await fetch(`/api/admin/users/${id}/status`, {
    method: "PATCH",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ status })
  });
  return handleResponse<AdminUserDetails>(response);
}

export async function resetUserPassword(id: number, token: string): Promise<PasswordResetResponse> {
  const response = await fetch(`/api/admin/users/${id}/password-reset`, {
    method: "POST",
    headers: makeHeaders(token)
  });
  return handleResponse<PasswordResetResponse>(response);
}

// --- Reports ---

export async function getCurrentOccupancy(token: string): Promise<OccupancyReport[]> {
  const response = await fetch("/api/admin/reports/occupancy/current", { headers: makeHeaders(token) });
  return handleResponse<OccupancyReport[]>(response);
}

// --- Auth ---

export async function loginAdmin(email: string, password: string): Promise<{ email: string; firstName: string; lastName: string; roles: string[]; token: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(response);
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ email: string; firstName: string; lastName: string; roles: string[]; token: string }> {
  const response = await fetch("/api/me/password", {
    method: "PUT",
    headers: makeHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
  });
  return handleResponse(response);
}
