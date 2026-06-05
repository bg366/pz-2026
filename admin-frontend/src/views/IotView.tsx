import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { styles } from "../styles";
import { useToast } from "../components/Toast";
import { PL, pl } from "../i18n";
import { getParkingLots } from "../api/client";
import type { ParkingLot } from "../api/types";

type IotDeviceStatus = "ACTIVE" | "INACTIVE" | "ERROR";

type IotDevice = {
  id: number; parkingLotId: number; parkingLotName: string;
  externalDeviceId: string; status: IotDeviceStatus; lastSeenAt: string | null; createdAt: string;
};

type Props = { token: string };

async function fetchDevices(token: string): Promise<IotDevice[]> {
  const res = await fetch("/api/admin/iot-devices", { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<IotDevice[]>;
}

async function registerDevice(token: string, parkingLotId: number, externalDeviceId: string): Promise<IotDevice> {
  const res = await fetch("/api/admin/iot-devices", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ parkingLotId, externalDeviceId })
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return res.json() as Promise<IotDevice>;
}

async function sendReading(token: string, deviceId: string, occupiedSpots: number): Promise<IotDevice> {
  const res = await fetch("/api/integrations/iot/occupancy", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, occupiedSpots })
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return res.json() as Promise<IotDevice>;
}

function statusBadgeStyle(status: IotDeviceStatus): React.CSSProperties {
  if (status === "ACTIVE") return { backgroundColor: "#ecfdf5", color: "#047857" };
  if (status === "ERROR") return { backgroundColor: "#fff1f2", color: "#be123c" };
  return { backgroundColor: "#f3f4f6", color: "#6b7280" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pl-PL");
}

export default function IotView({ token }: Props) {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [parkingLotId, setParkingLotId] = useState("");
  const [externalDeviceId, setExternalDeviceId] = useState("");
  const [readingDeviceId, setReadingDeviceId] = useState("");
  const [readingOccupied, setReadingOccupied] = useState("0");

  async function load() {
    try {
      const [nextDevices, nextParkings] = await Promise.all([
        fetchDevices(token),
        getParkingLots(token)
      ]);
      setDevices(nextDevices.sort((a, b) => a.id - b.id));
      setParkingLots(nextParkings.sort((a, b) => a.id - b.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd ładowania urządzeń.", "error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await registerDevice(token, Number(parkingLotId), externalDeviceId.trim());
      showToast(`Urządzenie ${externalDeviceId} zarejestrowane.`);
      setParkingLotId("");
      setExternalDeviceId("");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd rejestracji urządzenia.", "error");
    }
  }

  async function handleReading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await sendReading(token, readingDeviceId.trim(), Number(readingOccupied));
      showToast(`Odczyt z ${readingDeviceId}: ${readingOccupied} zajętych miejsc.`);
      setReadingDeviceId("");
      setReadingOccupied("0");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd wysyłania odczytu.", "error");
    }
  }

  const visibleDevices = devices.filter((device) => {
    const needle = deviceFilter.trim().toLowerCase();
    if (!needle) return true;
    return [
      String(device.id),
      device.externalDeviceId,
      device.parkingLotName,
      String(device.parkingLotId),
      device.status
    ].some((value) => value.toLowerCase().includes(needle));
  });

  return (
    <div style={styles.stack}>
      {/* Lista urządzeń */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Urządzenia IoT</h2>
            <p style={styles.helper}>Czujniki zajętości przypisane do parkingów.</p>
          </div>
          <button type="button" style={styles.subtleButton} onClick={() => void load()}>Odśwież</button>
        </div>

        <label style={{ ...styles.field, marginBottom: "16px" }}>
          <span style={styles.label}>Filtr</span>
          <input
            style={styles.input}
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            placeholder="Szukaj po ID, urządzeniu, parkingu albo statusie"
          />
        </label>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Urządzenie</th>
                <th style={styles.th}>Parking</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Ostatni odczyt</th>
              </tr>
            </thead>
            <tbody>
              {visibleDevices.map((d) => (
                <tr key={d.id}>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, fontSize: "11px" }}>#{d.id}</span>
                  </td>
                  <td style={styles.td}>
                    <strong>{d.externalDeviceId}</strong>
                  </td>
                  <td style={styles.td}>
                    {d.parkingLotName}
                    <div style={styles.helper}>ID: #{d.parkingLotId}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...statusBadgeStyle(d.status) }}>
                      {pl(PL.iotStatus, d.status)}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(d.lastSeenAt)}</td>
                </tr>
              ))}
              {visibleDevices.length === 0 ? (
                <tr><td style={styles.td} colSpan={5}>Brak zarejestrowanych urządzeń.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rejestracja + Symulacja */}
      <div className="admin-form-row" style={styles.formRow}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.sectionTitle}>Zarejestruj urządzenie</h2>
          </div>
          <form style={styles.formGrid} onSubmit={(e) => void handleRegister(e)}>
            <label style={styles.field}>
              <span style={styles.label}>Parking</span>
              <select style={styles.input} value={parkingLotId}
                onChange={(e) => setParkingLotId(e.target.value)} required>
                <option value="">Wybierz parking</option>
                {parkingLots.map((parking) => (
                  <option key={parking.id} value={String(parking.id)}>
                    #{parking.id} - {parking.name} - {parking.address} ({parking.latitude.toFixed(4)}, {parking.longitude.toFixed(4)})
                  </option>
                ))}
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.label}>ID zewnętrzne urządzenia</span>
              <input style={styles.input} value={externalDeviceId}
                onChange={(e) => setExternalDeviceId(e.target.value)} placeholder="np. SENSOR-01" required />
            </label>
            <button type="submit" style={styles.button}>Zarejestruj</button>
          </form>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.sectionTitle}>Symuluj odczyt czujnika</h2>
          </div>
          <p style={styles.helper}>
            Wyślij odczyt obłożenia — zaktualizuje zajętość parkingu w czasie rzeczywistym.
          </p>
          <form style={{ ...styles.formGrid, marginTop: "12px" }} onSubmit={(e) => void handleReading(e)}>
            <label style={styles.field}>
              <span style={styles.label}>ID zewnętrzne urządzenia</span>
              <input style={styles.input} value={readingDeviceId}
                onChange={(e) => setReadingDeviceId(e.target.value)} placeholder="np. SENSOR-01" required />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Zajęte miejsca</span>
              <input style={styles.input} type="number" min="0" value={readingOccupied}
                onChange={(e) => setReadingOccupied(e.target.value)} required />
            </label>
            <button type="submit" style={styles.button}>Wyślij odczyt</button>
          </form>
        </section>
      </div>
    </div>
  );
}
