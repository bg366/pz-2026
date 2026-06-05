import { useEffect, useState } from "react";
import { getCurrentOccupancy } from "../api/client";
import type { OccupancyReport } from "../api/types";
import { styles } from "../styles";

type Props = { token: string };

export default function ReportsView({ token }: Props) {
  const [reports, setReports] = useState<OccupancyReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setReports(await getCurrentOccupancy(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania raportów.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Raporty obłożenia</h2>
          <p style={styles.helper}>Aktualny raport wolnych i zajętych miejsc.</p>
        </div>
        <button type="button" style={styles.subtleButton} onClick={() => void load()} disabled={loading}>
          Odśwież
        </button>
      </div>

      {error ? <div style={{ ...styles.feedback, ...styles.error }}>{error}</div> : null}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Parking</th>
              <th style={styles.th}>Obłożenie</th>
              <th style={styles.th}>SCT</th>
              <th style={styles.th}>Pomiar</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.parkingLotId}>
                <td style={styles.td}><strong>{report.parkingLotName}</strong></td>
                <td style={styles.td}>
                  {report.occupiedSpots} / {report.totalSpots}
                  <div style={styles.helper}>{report.occupancyPercent}% zajęte</div>
                </td>
                <td style={styles.td}>
                  {report.occupiedSctSpots} / {report.totalSctSpots}
                  <div style={styles.helper}>wolne SCT: {report.availableSctSpots}</div>
                </td>
                <td style={styles.td}>{new Date(report.recordedAt).toLocaleString("pl-PL")}</td>
              </tr>
            ))}
            {reports.length === 0 && !loading ? (
              <tr><td style={styles.td} colSpan={4}>Brak danych.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
