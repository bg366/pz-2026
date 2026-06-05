import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { ParkingLot } from "../api/types";

export type ParkingLotPayload = {
  id?: number;
  name: string;
  address: string;
  description: string;
  status: "ACTIVE" | "INACTIVE" | "TEMPORARILY_CLOSED";
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
  name: "",
  address: "",
  description: "",
  status: "ACTIVE",
  zone: "ZONE_A",
  latitude: "50.0615",
  longitude: "19.9370",
  totalSpots: "100",
  occupiedSpots: 0,
  totalSctSpots: "10",
  occupiedSctSpots: 0,
  openingHours: "24/7",
  parkingType: "PUBLIC"
};

const styles = {
  form: {
    display: "grid",
    gap: "16px"
  },
  field: {
    display: "grid",
    gap: "8px"
  },
  row: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px"
  },
  label: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#7c2d12"
  },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    borderRadius: "12px",
    border: "1px solid rgba(124, 45, 18, 0.18)",
    padding: "12px 14px",
    fontSize: "14px",
    backgroundColor: "#fffefc"
  },
  button: {
    border: "none",
    borderRadius: "999px",
    padding: "12px 18px",
    fontWeight: 700,
    backgroundColor: "#9a3412",
    color: "#ffffff",
    cursor: "pointer"
  },
  feedback: {
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14px"
  },
  success: {
    backgroundColor: "#ecfdf5",
    color: "#047857"
  },
  error: {
    backgroundColor: "#fff1f2",
    color: "#be123c"
  }
} satisfies Record<string, CSSProperties>;

export default function ParkingLotForm({ initialData, authToken, onSaved }: ParkingLotFormProps) {
  const [formData, setFormData] = useState<ParkingLotPayload>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormData(initialData ?? emptyState);
    setError(null);
    setSuccess(null);
  }, [initialData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const method = formData.id ? "PUT" : "POST";
      const endpoint = formData.id ? `/api/admin/parking-lots/${formData.id}` : "/api/admin/parking-lots";
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authToken}`
        },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          description: formData.description || null,
          status: formData.status,
          zone: formData.zone,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude),
          totalSpots: Number(formData.totalSpots),
          occupiedSpots: formData.id ? formData.occupiedSpots : undefined,
          totalSctSpots: Number(formData.totalSctSpots),
          occupiedSctSpots: formData.id ? formData.occupiedSctSpots : undefined,
          openingHours: formData.openingHours,
          parkingType: formData.parkingType
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as ParkingLot;
      setSuccess(formData.id ? "Parking został zaktualizowany." : "Parking został dodany.");
      if (!formData.id) {
        setFormData(emptyState);
      }
      await onSaved(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się zapisać parkingu.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField<Key extends keyof ParkingLotPayload>(key: Key, value: ParkingLotPayload[Key]) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <label style={styles.field}>
        <span style={styles.label}>Nazwa</span>
        <input
          style={styles.input}
          value={formData.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
        />
      </label>

      <label style={styles.field}>
        <span style={styles.label}>Adres</span>
        <input
          style={styles.input}
          value={formData.address}
          onChange={(event) => updateField("address", event.target.value)}
          required
        />
      </label>

      <label style={styles.field}>
        <span style={styles.label}>Opis</span>
        <input
          style={styles.input}
          value={formData.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Krotki opis parkingu"
        />
      </label>

      <div style={styles.row}>
        <label style={styles.field}>
          <span style={styles.label}>Strefa</span>
          <select
            style={styles.input}
            value={formData.zone}
            onChange={(event) => updateField("zone", event.target.value as ParkingLotPayload["zone"])}
          >
            <option value="ZONE_A">ZONE_A</option>
            <option value="ZONE_B">ZONE_B</option>
            <option value="ZONE_C">ZONE_C</option>
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Status</span>
          <select
            style={styles.input}
            value={formData.status}
            onChange={(event) => updateField("status", event.target.value as ParkingLotPayload["status"])}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="TEMPORARILY_CLOSED">TEMPORARILY_CLOSED</option>
          </select>
        </label>
      </div>

      <div style={styles.row}>
        <label style={styles.field}>
          <span style={styles.label}>Typ parkingu</span>
          <select
            style={styles.input}
            value={formData.parkingType}
            onChange={(event) => updateField("parkingType", event.target.value)}
          >
            <option value="PUBLIC">PUBLIC</option>
            <option value="PRIVATE">PRIVATE</option>
            <option value="PARK_AND_RIDE">PARK_AND_RIDE</option>
            <option value="UNDERGROUND">UNDERGROUND</option>
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Godziny dzialania</span>
          <input
            style={styles.input}
            value={formData.openingHours}
            onChange={(event) => updateField("openingHours", event.target.value)}
            required
          />
        </label>
      </div>

      <div style={styles.row}>
        <label style={styles.field}>
          <span style={styles.label}>Latitude</span>
          <input
            style={styles.input}
            type="number"
            step="0.0001"
            value={formData.latitude}
            onChange={(event) => updateField("latitude", event.target.value)}
            required
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Longitude</span>
          <input
            style={styles.input}
            type="number"
            step="0.0001"
            value={formData.longitude}
            onChange={(event) => updateField("longitude", event.target.value)}
            required
          />
        </label>
      </div>

      <label style={styles.field}>
        <span style={styles.label}>Liczba miejsc</span>
        <input
          style={styles.input}
          type="number"
          min="0"
          value={formData.totalSpots}
          onChange={(event) => updateField("totalSpots", event.target.value)}
          required
        />
      </label>

      <div style={styles.row}>
        <label style={styles.field}>
          <span style={styles.label}>Miejsca SCT</span>
          <input
            style={styles.input}
            type="number"
            min="0"
            value={formData.totalSctSpots}
            onChange={(event) => updateField("totalSctSpots", event.target.value)}
            required
          />
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Zajete SCT</span>
          <input
            style={styles.input}
            type="number"
            min="0"
            value={formData.occupiedSctSpots}
            onChange={(event) => updateField("occupiedSctSpots", Number(event.target.value))}
            disabled={!formData.id}
          />
        </label>
      </div>

      {success ? <div style={{ ...styles.feedback, ...styles.success }}>{success}</div> : null}
      {error ? <div style={{ ...styles.feedback, ...styles.error }}>{error}</div> : null}

      <button style={styles.button} type="submit" disabled={submitting}>
        {submitting ? "Zapisywanie..." : formData.id ? "Zapisz parking" : "Dodaj parking"}
      </button>
    </form>
  );
}
