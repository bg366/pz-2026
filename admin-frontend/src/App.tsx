import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import ParkingLotForm from "./components/ParkingLotForm";

type Tariff = {
  id: number;
  pricePerHour: number;
  currency: string;
};

type ParkingLot = {
  id: number;
  name: string;
  address: string;
  zone: "ZONE_A" | "ZONE_B" | "ZONE_C";
  latitude: number;
  longitude: number;
  totalSpots: number;
  occupiedSpots: number;
  parkingType: string;
  tariffs?: Tariff[];
};

type PagedResponse = {
  content?: ParkingLot[];
};

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 20px",
    background:
      "radial-gradient(circle at top, rgba(248, 220, 183, 0.35), transparent 35%), linear-gradient(180deg, #fff8ef 0%, #fffefc 100%)",
    color: "#1f2937",
    fontFamily: '"Segoe UI", sans-serif'
  },
  container: {
    maxWidth: "1180px",
    margin: "0 auto"
  },
  header: {
    marginBottom: "24px"
  },
  title: {
    margin: "0 0 8px",
    fontSize: "36px",
    fontWeight: 800
  },
  lead: {
    margin: 0,
    maxWidth: "720px",
    color: "#5b6475",
    lineHeight: 1.6
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: "24px"
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid rgba(162, 123, 92, 0.18)",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 18px 40px rgba(98, 68, 40, 0.08)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px"
  },
  button: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 16px",
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#9a3412",
    cursor: "pointer"
  },
  tableWrapper: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const
  },
  th: {
    textAlign: "left" as const,
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#7c5c46",
    padding: "0 0 12px"
  },
  td: {
    padding: "14px 0",
    borderTop: "1px solid rgba(162, 123, 92, 0.14)",
    verticalAlign: "top" as const
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    backgroundColor: "#ffedd5",
    color: "#9a3412",
    fontSize: "12px",
    fontWeight: 700
  },
  helper: {
    margin: "12px 0 0",
    color: "#6b7280"
  },
  error: {
    marginBottom: "16px",
    padding: "12px 14px",
    borderRadius: "12px",
    backgroundColor: "#fff1f2",
    color: "#be123c"
  }
} satisfies Record<string, CSSProperties>;

function normalizeResponse(payload: ParkingLot[] | PagedResponse): ParkingLot[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload.content) ? payload.content : [];
}

export default function App() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadParkingLots(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetch("/api/admin/parking-lots?size=50");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as ParkingLot[] | PagedResponse;
      setParkingLots(normalizeResponse(payload));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadParkingLots();
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Parking Admin Kraków</h1>
          <p style={styles.lead}>
            Minimalny panel administracyjny do przeglądania i dodawania parkingów.
            Dane są pobierane bezpośrednio z backendu MVP.
          </p>
        </header>

        <div style={styles.layout}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={{ margin: 0 }}>Lista parkingów</h2>
                <p style={styles.helper}>Aktualny stan wystawiony przez `/api/admin/parking-lots`.</p>
              </div>

              <button
                type="button"
                style={styles.button}
                onClick={() => void loadParkingLots(true)}
                disabled={refreshing}
              >
                {refreshing ? "Odświeżanie..." : "Odśwież"}
              </button>
            </div>

            {error ? <div style={styles.error}>Nie udało się pobrać parkingów: {error}</div> : null}

            {loading ? (
              <p style={styles.helper}>Ładowanie parkingów...</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Parking</th>
                      <th style={styles.th}>Strefa</th>
                      <th style={styles.th}>Adres</th>
                      <th style={styles.th}>Obłożenie</th>
                      <th style={styles.th}>Cena</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parkingLots.map((parkingLot) => {
                      const tariff = parkingLot.tariffs?.[0];
                      return (
                        <tr key={parkingLot.id}>
                          <td style={styles.td}>
                            <strong>{parkingLot.name}</strong>
                            <div style={styles.helper}>{parkingLot.parkingType}</div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.badge}>{parkingLot.zone}</span>
                          </td>
                          <td style={styles.td}>{parkingLot.address}</td>
                          <td style={styles.td}>
                            {parkingLot.occupiedSpots} / {parkingLot.totalSpots}
                          </td>
                          <td style={styles.td}>
                            {tariff ? `${tariff.pricePerHour} ${tariff.currency}/h` : "Brak taryfy"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={styles.card}>
            <h2 style={{ marginTop: 0 }}>Dodaj parking</h2>
            <p style={styles.helper}>
              Formularz wysyła `POST /api/admin/parking-lots` z podstawowymi polami wymaganymi w MVP.
            </p>
            <ParkingLotForm onCreated={() => loadParkingLots(true)} />
          </section>
        </div>
      </div>
    </main>
  );
}
