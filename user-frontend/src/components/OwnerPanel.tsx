import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getOwnerParkingLots, updateOwnerOccupancy, updateOwnerSpots } from "../api/client";
import type { AuthState, OwnerParkingLot, OwnerParkingSpot } from "../api/types";

const SPOT_CATS = ["REGULAR", "EV", "DISABLED", "SCT_READY"] as const;
const SPOT_LABELS: Record<string, string> = {
  REGULAR: "Standardowe", EV: "Elektryczne", DISABLED: "Niepełnosprawni", SCT_READY: "SCT"
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktywny", INACTIVE: "Nieaktywny", TEMPORARILY_CLOSED: "Tymcz. zamknięty"
};
const ZONE_LABELS: Record<string, string> = {
  ZONE_A: "Strefa A", ZONE_B: "Strefa B", ZONE_C: "Strefa C"
};
const TYPE_LABELS: Record<string, string> = {
  PUBLIC: "Publiczny", PRIVATE: "Prywatny", PARK_AND_RIDE: "Park & Ride", UNDERGROUND: "Podziemny"
};

type SpotForm = { category: string; total: string; occupied: string };

function buildSpotForms(spots: OwnerParkingSpot[]): SpotForm[] {
  return SPOT_CATS.map((cat) => {
    const match = spots.find((s) => s.category === cat);
    return { category: cat, total: String(match?.total ?? 0), occupied: String(match?.occupied ?? 0) };
  });
}

type Props = { auth: AuthState | null };

export default function OwnerPanel({ auth }: Props) {
  const [parkings, setParkings] = useState<OwnerParkingLot[]>([]);
  const [selected, setSelected] = useState<OwnerParkingLot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [occupancyValue, setOccupancyValue] = useState("0");
  const [spotForms, setSpotForms] = useState<SpotForm[]>([]);
  const detailsRef = useRef<HTMLDivElement>(null);

  const isOwner = auth?.roles.includes("PARKING_OWNER") ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setParkings(await getOwnerParkingLots());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się załadować parkingów.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOwner) void load();
  }, [isOwner]);

  if (!auth || !isOwner) {
    return (
      <div className="stack">
        <div className="section-heading">
          <h2>Panel właściciela</h2>
          <p>Ta sekcja dostępna jest wyłącznie dla kont z rolą Właściciela parkingu.</p>
        </div>
      </div>
    );
  }

  function selectParking(p: OwnerParkingLot) {
    setSelected(p);
    setOccupancyValue(String(p.occupiedSpots));
    setSpotForms(buildSpotForms(p.spots));
    setStatus(null);
    setError(null);
    setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function submitOccupancy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setStatus(null);
    try {
      const updated = await updateOwnerOccupancy(selected.id, Number(occupancyValue));
      setSelected(updated);
      setStatus("Obłożenie zaktualizowane.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd aktualizacji obłożenia.");
    }
  }

  async function submitSpots(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setStatus(null);
    try {
      const updated = await updateOwnerSpots(
        selected.id,
        spotForms.map((s) => ({ category: s.category, total: Number(s.total), occupied: Number(s.occupied) }))
      );
      setSelected(updated);
      setSpotForms(buildSpotForms(updated.spots));
      setStatus("Kategorie miejsc zapisane.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu kategorii.");
    }
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Moje parkingi</h2>
        <p>Zarządzaj obłożeniem i kategoriami miejsc swoich parkingów.</p>
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" className="button button--ghost" onClick={() => void load()} disabled={loading}>
          {loading ? "Ładowanie..." : "Odśwież"}
        </button>
      </div>

      {error ? <div className="feedback feedback--error">{error}</div> : null}
      {status ? <div className="feedback feedback--empty">{status}</div> : null}

      <div className="results-grid">
        {parkings.map((p) => (
          <article key={p.id} className="result-card">
            <div className="result-card__header">
              <div>
                <h3>{p.name}</h3>
                <p>{p.address}</p>
              </div>
              <span className={p.status === "ACTIVE" ? "badge badge--success" : "badge badge--danger"}>
                {STATUS_LABELS[p.status] ?? p.status}
              </span>
            </div>
            <dl className="details">
              <div><dt>Strefa</dt><dd>{ZONE_LABELS[p.zone] ?? p.zone}</dd></div>
              <div><dt>Typ</dt><dd>{TYPE_LABELS[p.parkingType] ?? p.parkingType}</dd></div>
              <div><dt>Wolne miejsca</dt><dd>{p.totalSpots - p.occupiedSpots} / {p.totalSpots}</dd></div>
              <div><dt>Miejsca SCT</dt><dd>{p.totalSctSpots - p.occupiedSctSpots} wolnych / {p.totalSctSpots}</dd></div>
              <div><dt>Godziny</dt><dd>{p.openingHours}</dd></div>
            </dl>
            <div className="result-card__actions">
              <button
                type="button"
                className={selected?.id === p.id ? "button" : "button button--ghost"}
                onClick={() => selectParking(p)}
              >
                {selected?.id === p.id ? "Edytujesz" : "Zarządzaj"}
              </button>
            </div>
          </article>
        ))}
        {!loading && parkings.length === 0 ? (
          <div className="feedback feedback--empty">
            Brak przypisanych parkingów. Poproś administratora o przypisanie parkingu do Twojego konta.
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="card stack" ref={detailsRef}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div>
              <h3 style={{ margin: 0 }}>{selected.name}</h3>
              <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: "14px" }}>
                #{selected.id} &bull; {selected.address}
              </p>
            </div>
            <button type="button" className="button button--ghost" onClick={() => setSelected(null)}>Zamknij</button>
          </div>

          <form className="form-grid form-grid--three" onSubmit={(e) => void submitOccupancy(e)}>
            <h4 style={{ margin: 0, gridColumn: "1 / -1" }}>Obłożenie ogólne</h4>
            <label className="field">
              <span>Zajęte miejsca (max {selected.totalSpots})</span>
              <input
                type="number"
                min="0"
                max={selected.totalSpots}
                value={occupancyValue}
                onChange={(e) => setOccupancyValue(e.target.value)}
              />
            </label>
            <div className="form-actions form-grid__wide">
              <button type="submit" className="button">Zapisz obłożenie</button>
            </div>
          </form>

          <form className="form-grid" onSubmit={(e) => void submitSpots(e)}>
            <h4 style={{ margin: 0 }}>Kategorie miejsc</h4>
            {spotForms.map((spot, idx) => (
              <div className="form-grid form-grid--three" key={spot.category}>
                <label className="field">
                  <span>{SPOT_LABELS[spot.category] ?? spot.category} — razem</span>
                  <input
                    type="number"
                    min="0"
                    value={spot.total}
                    onChange={(e) =>
                      setSpotForms((cur) => cur.map((s, i) => i === idx ? { ...s, total: e.target.value } : s))
                    }
                  />
                </label>
                <label className="field">
                  <span>{SPOT_LABELS[spot.category] ?? spot.category} — zajęte</span>
                  <input
                    type="number"
                    min="0"
                    value={spot.occupied}
                    onChange={(e) =>
                      setSpotForms((cur) => cur.map((s, i) => i === idx ? { ...s, occupied: e.target.value } : s))
                    }
                  />
                </label>
              </div>
            ))}
            <div className="form-actions">
              <button type="submit" className="button">Zapisz kategorie</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
