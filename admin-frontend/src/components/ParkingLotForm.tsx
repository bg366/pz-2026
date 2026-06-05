import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { ParkingLot } from "../api/types";
import { useToast } from "./Toast";
import AdminLocationPicker from "./AdminLocationPicker";

export type ParkingLotPayload = {
  id?: number;
  name: string;
  address: string;
  description: string;
  status: "ACTIVE" | "INACTIVE" | "TEMPORARILY_CLOSED" | "PENDING_APPROVAL";
  zone: "ZONE_A" | "ZONE_B" | "ZONE_C";
  latitude: string;
  longitude: string;
  totalSpots: string;
  occupiedSpots: number;
  totalSctSpots: string;
  occupiedSctSpots: number;
  openingHours: string;
  parkingType: string;
};

type ParkingLotFormProps = {
  initialData?: ParkingLotPayload | null;
  authToken: string;
  onSaved: (parkingLot: ParkingLot) => Promise<void> | void;
};

const emptyState: ParkingLotPayload = {
  name: "", address: "", description: "", status: "ACTIVE", zone: "ZONE_A",
  latitude: "50.0615", longitude: "19.9370",
  totalSpots: "100", occupiedSpots: 0, totalSctSpots: "10", occupiedSctSpots: 0,
  openingHours: "24/7", parkingType: "PUBLIC"
};

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", borderRadius: "12px",
  border: "1px solid rgba(124, 45, 18, 0.18)", padding: "12px 14px",
  fontSize: "14px", backgroundColor: "#fffefc"
};
const lbl: React.CSSProperties = { fontSize: "14px", fontWeight: 700, color: "#7c2d12" };
const fld: React.CSSProperties = { display: "grid", gap: "8px" };
const row: React.CSSProperties = { gap: "12px" };
const btn: React.CSSProperties = {
  border: "none", borderRadius: "999px", padding: "12px 18px",
  fontWeight: 700, backgroundColor: "#9a3412", color: "#ffffff", cursor: "pointer"
};

export default function ParkingLotForm({ initialData, authToken, onSaved }: ParkingLotFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<ParkingLotPayload>(emptyState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setFormData(initialData ?? emptyState); }, [initialData]);

  function set<K extends keyof ParkingLotPayload>(key: K, value: ParkingLotPayload[K]) {
    setFormData((cur) => ({ ...cur, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const method = formData.id ? "PUT" : "POST";
      const url = formData.id ? `/api/admin/parking-lots/${formData.id}` : "/api/admin/parking-lots";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: formData.name, address: formData.address,
          description: formData.description || null,
          status: formData.status, zone: formData.zone,
          latitude: Number(formData.latitude), longitude: Number(formData.longitude),
          totalSpots: Number(formData.totalSpots),
          occupiedSpots: formData.id ? formData.occupiedSpots : undefined,
          totalSctSpots: Number(formData.totalSctSpots),
          occupiedSctSpots: formData.id ? formData.occupiedSctSpots : undefined,
          openingHours: formData.openingHours, parkingType: formData.parkingType
        })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as ParkingLot;
      showToast(formData.id ? "Parking zaktualizowany." : "Parking dodany.");
      if (!formData.id) setFormData(emptyState);
      await onSaved(payload);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nie udało się zapisać parkingu.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form style={{ display: "grid", gap: "16px" }} onSubmit={handleSubmit}>
      <label style={fld}>
        <span style={lbl}>Nazwa</span>
        <input style={inp} value={formData.name} onChange={(e) => set("name", e.target.value)} required />
      </label>

      <label style={fld}>
        <span style={lbl}>Adres</span>
        <input style={inp} value={formData.address} onChange={(e) => set("address", e.target.value)} required />
      </label>

      <label style={fld}>
        <span style={lbl}>Opis</span>
        <input style={inp} value={formData.description} onChange={(e) => set("description", e.target.value)} placeholder="Krótki opis parkingu" />
      </label>

      <div className="admin-form-row" style={row}>
        <label style={fld}>
          <span style={lbl}>Strefa</span>
          <select style={inp} value={formData.zone} onChange={(e) => set("zone", e.target.value as ParkingLotPayload["zone"])}>
            <option value="ZONE_A">Strefa A</option>
            <option value="ZONE_B">Strefa B</option>
            <option value="ZONE_C">Strefa C</option>
          </select>
        </label>
        <label style={fld}>
          <span style={lbl}>Status</span>
          <select style={inp} value={formData.status} onChange={(e) => set("status", e.target.value as ParkingLotPayload["status"])}>
            <option value="ACTIVE">Aktywny</option>
            <option value="INACTIVE">Nieaktywny</option>
            <option value="TEMPORARILY_CLOSED">Tymczasowo zamknięty</option>
            <option value="PENDING_APPROVAL">Oczekuje na zatwierdzenie</option>
          </select>
        </label>
      </div>

      <div className="admin-form-row" style={row}>
        <label style={fld}>
          <span style={lbl}>Typ parkingu</span>
          <select style={inp} value={formData.parkingType} onChange={(e) => set("parkingType", e.target.value)}>
            <option value="PUBLIC">Publiczny</option>
            <option value="PRIVATE">Prywatny</option>
            <option value="PARK_AND_RIDE">Park &amp; Ride</option>
            <option value="UNDERGROUND">Podziemny</option>
          </select>
        </label>
        <label style={fld}>
          <span style={lbl}>Godziny działania</span>
          <input style={inp} value={formData.openingHours} onChange={(e) => set("openingHours", e.target.value)} required />
        </label>
      </div>

      <div className="admin-form-row" style={row}>
        <label style={fld}>
          <span style={lbl}>Szerokość geogr. (lat)</span>
          <input style={inp} type="number" step="0.0001" value={formData.latitude} onChange={(e) => set("latitude", e.target.value)} required />
        </label>
        <label style={fld}>
          <span style={lbl}>Długość geogr. (lng)</span>
          <input style={inp} type="number" step="0.0001" value={formData.longitude} onChange={(e) => set("longitude", e.target.value)} required />
        </label>
      </div>

      <AdminLocationPicker
        latitude={Number(formData.latitude)}
        longitude={Number(formData.longitude)}
        onChange={(latitude, longitude) => {
          set("latitude", String(latitude));
          set("longitude", String(longitude));
        }}
      />

      <label style={fld}>
        <span style={lbl}>Łączna liczba miejsc</span>
        <input style={inp} type="number" min="0" value={formData.totalSpots} onChange={(e) => set("totalSpots", e.target.value)} required />
      </label>

      <div className="admin-form-row" style={row}>
        <label style={fld}>
          <span style={lbl}>Miejsca SCT (łącznie)</span>
          <input style={inp} type="number" min="0" value={formData.totalSctSpots} onChange={(e) => set("totalSctSpots", e.target.value)} required />
        </label>
        <label style={fld}>
          <span style={lbl}>Miejsca SCT (zajęte)</span>
          <input style={inp} type="number" min="0" value={formData.occupiedSctSpots}
            onChange={(e) => set("occupiedSctSpots", Number(e.target.value))} disabled={!formData.id} />
        </label>
      </div>

      <button style={btn} type="submit" disabled={submitting}>
        {submitting ? "Zapisywanie..." : formData.id ? "Zapisz parking" : "Dodaj parking"}
      </button>
    </form>
  );
}
