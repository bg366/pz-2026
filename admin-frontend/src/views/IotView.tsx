import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { styles } from "../styles";

type IotDeviceStatus = "ACTIVE" | "INACTIVE" | "ERROR";

type IotDevice = {
  id: number;
  parkingLotId: number;
  parkingLotName: string;
  externalDeviceId: string;
  status: IotDeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
};

type Props = { token: string };

async function fetchDevices(token: string): Promise<IotDevice[]> {
  const res = await fetch("/api/admin/iot-devices", {
    headers: { Authorization: `Basic ${token}` }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<IotDevice[]>;
}

async function registerDevice(token: string, parkingLotId: number, externalDeviceId: string): Promise<IotDevice> {
  const res = await fetch("/api/admin/iot-devices", {
    method: "POST",
    headers: { Authorization: `Basic ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ parkingLotId, externalDeviceId })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<IotDevice>;
}

async function sendReading(token: string, deviceId: string, occupiedSpots: number): Promise<IotDevice> {
  const res = await fetch("/api/integrations/iot/occupancy", {
    method: "POST",
    headers: { Authorization: `Basic ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, occupiedSpots })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<IotDevice>;
}

function statusBadgeStyle(status: IotDeviceStatus): Record<string, string> {
  if (status === "ACTIVE") return { backgroundColor: "#ecfdf5", color: "#047857" };
  if (status === "ERROR") return { backgroundColor: "#fff1f2", color: "#be123c" };
  return { backgroundColor: "#f3f4f6", color: "#6b7280" };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pl-PL");
}

export default function IotView({ token }: Props) {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [parkingLotId, setParkingLotId] = useState("");
  const [externalDeviceId, setExternalDeviceId] = useState("");
  const [readingDeviceId, setReadingDeviceId] = useState("");
  const [readingOccupied, setReadingOccupied] = useState("0");

  async function load() {
    try {
      setDevices(await fetchDevices(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania urządzeń.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    try {
      await registerDevice(token, Number(parkingLotId), externalDeviceId.trim());
      setStatus(`Zarejestrowano urządzenie: ${externalDeviceId}.`);
      setParkingLotId("");
      setExternalDeviceId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd rejestracji urządzenia.");
    }
  }

  async function handleReading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    try {
      await sendReading(token, readingDeviceId.trim(), Number(readingOccupied));
      setStatus(`Odczyt wysłany z urządzenia ${readingDeviceId}: ${readingOccupied} zajętych.`);
      setReadingDeviceId("");
      setReadingOccupied("0");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd wysyłania odczytu.");
    }
  }

  return (
    <div style={styles.grid}>
      {/* LEFT — devices table */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Urządzenia IoT</h2>
            <p style={styles.helper}>Lista czujników zajętości przypisanych do parkingów.</p>
          </div>
          <button type="button" style={styles.subtleButton} onClick={() => void load()}>Odśwież</button>
        </div>

        {status ? <div style={{ ...styles.feedback, ...styles.success }}>{status}</div> : null}
        {error ? <div style={{ ...styles.feedback, ...styles.error }}>{error}</div> : null}

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Urządzenie</th>
                <th style={styles.th}>Parking</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Ostatni odczyt</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td style={styles.td}>
                    <strong>{d.externalDeviceId}</strong>
                    <div style={styles.helper}>ID: {d.id}</div>
                  </td>
                  <td style={styles.td}>
                    {d.parkingLotName}
                    <div style={styles.helper}>#{d.parkingLotId}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...statusBadgeStyle(d.status) }}>
                      {d.status}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(d.lastSeenAt)}</td>
                </tr>
              ))}
              {devices.length === 0 ? (
                <tr><td style={styles.td} colSpan={4}>Brak zarejestrowanych urządzeń.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* RIGHT — forms */}
      <div style={styles.stack}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.sectionTitle}>Rejestruj urządzenie</h2>
          </div>
          <form style={styles.formGrid} onSubmit={(e) => void handleRegister(e)}>
            <label style={styles.field}>
              <span style={styles.label}>ID parkingu</span>
              <input style={styles.input} type="number" min="1" value={parkingLotId}
                onChange={(e) => setParkingLotId(e.target.value)} placeholder="np. 1" required />
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
            Wyślij odczyt obłożenia z urządzenia — zaktualizuje obłożenie parkingu.
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
