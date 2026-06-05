import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createOwnerParkingLot, getOwnerParkingLots, updateOwnerOccupancy, updateOwnerParkingPrice, updateOwnerSpots } from "../api/client";
import type { AuthState, OwnerParkingLot, OwnerParkingSpot, ParkingZone, PriceForm } from "../api/types";
import OwnerLocationPicker from "./OwnerLocationPicker";

const SPOT_CATS = ["REGULAR", "EV", "DISABLED", "SCT_READY"] as const;
const SPOT_LABELS: Record<string, string> = {
  REGULAR: "Standardowe", EV: "Elektryczne", DISABLED: "Niepełnosprawni", SCT_READY: "SCT"
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktywny", INACTIVE: "Nieaktywny", TEMPORARILY_CLOSED: "Tymcz. zamknięty", PENDING_APPROVAL: "Oczekuje na zatwierdzenie"
};
const ZONE_LABELS: Record<string, string> = {
  ZONE_A: "Strefa A", ZONE_B: "Strefa B", ZONE_C: "Strefa C"
};
const TYPE_LABELS: Record<string, string> = {
  PUBLIC: "Publiczny", PRIVATE: "Prywatny", PARK_AND_RIDE: "Park & Ride", UNDERGROUND: "Podziemny"
};
const PRICE_LABELS: Record<keyof PriceForm, string> = {
  firstHourPrice: "Pierwsza godzina",
  secondHourPrice: "Druga godzina",
  thirdHourPrice: "Trzecia godzina",
  nextHourPrice: "Kolejna godzina",
  dailyPrice: "Doba"
};
const emptyPriceForm: PriceForm = {
  firstHourPrice: "0",
  secondHourPrice: "0",
  thirdHourPrice: "0",
  nextHourPrice: "0",
  dailyPrice: "0"
};

type SpotForm = { category: string; total: string; occupied: string };
type CreateParkingForm = {
  name: string;
  address: string;
  description: string;
  zone: ParkingZone;
  latitude: string;
  longitude: string;
  totalSpots: string;
  totalSctSpots: string;
  openingHours: string;
  parkingType: string;
};

const emptyCreateForm: CreateParkingForm = {
  name: "",
  address: "",
  description: "",
  zone: "ZONE_A",
  latitude: "50.0615",
  longitude: "19.9370",
  totalSpots: "20",
  totalSctSpots: "0",
  openingHours: "24/7",
  parkingType: "PRIVATE"
};

function buildSpotForms(spots: OwnerParkingSpot[]): SpotForm[] {
  return SPOT_CATS.map((cat) => {
    const match = spots.find((s) => s.category === cat);
    return { category: cat, total: String(match?.total ?? 0), occupied: String(match?.occupied ?? 0) };
  });
}

function mapPriceToForm(price: OwnerParkingLot["price"]): PriceForm {
  if (!price) return emptyPriceForm;
  return {
    firstHourPrice: String(price.firstHourPrice),
    secondHourPrice: String(price.secondHourPrice),
    thirdHourPrice: String(price.thirdHourPrice),
    nextHourPrice: String(price.nextHourPrice),
    dailyPrice: String(price.dailyPrice)
  };
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
  const [priceForm, setPriceForm] = useState<PriceForm>(emptyPriceForm);
  const [createForm, setCreateForm] = useState<CreateParkingForm>(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [parkingFilter, setParkingFilter] = useState("");
  const [parkingSort, setParkingSort] = useState<"ID_ASC" | "ID_DESC" | "NAME_ASC" | "STATUS_ASC">("ID_ASC");
  const detailsRef = useRef<HTMLDivElement>(null);

  const isOwner = auth?.roles.includes("PARKING_OWNER") ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const nextParkings = await getOwnerParkingLots();
      setParkings(nextParkings.sort((a, b) => a.id - b.id));
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
    setPriceForm(mapPriceToForm(p.price));
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

  async function submitPrice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setStatus(null);
    try {
      await updateOwnerParkingPrice(selected.id, priceForm);
      setStatus("Cennik parkingu zapisany.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu cennika.");
    }
  }

  async function submitCreateParking(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setCreating(true);
    try {
      const created = await createOwnerParkingLot({
        name: createForm.name,
        address: createForm.address,
        description: createForm.description.trim() ? createForm.description : null,
        zone: createForm.zone,
        latitude: Number(createForm.latitude),
        longitude: Number(createForm.longitude),
        totalSpots: Number(createForm.totalSpots),
        totalSctSpots: Number(createForm.totalSctSpots),
        openingHours: createForm.openingHours,
        parkingType: createForm.parkingType
      });
      setCreateForm(emptyCreateForm);
      setStatus(`Parking "${created.name}" zgłoszony do zatwierdzenia przez administratora.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zgłaszania parkingu.");
    } finally {
      setCreating(false);
    }
  }

  function updateCreateField<K extends keyof CreateParkingForm>(key: K, value: CreateParkingForm[K]) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  const visibleParkings = parkings
    .filter((parking) => {
      const needle = parkingFilter.trim().toLowerCase();
      if (!needle) return true;
      return [
        String(parking.id),
        parking.name,
        parking.address,
        parking.status,
        parking.zone,
        parking.parkingType
      ].some((value) => value.toLowerCase().includes(needle));
    })
    .sort((a, b) => {
      switch (parkingSort) {
        case "ID_DESC": return b.id - a.id;
        case "NAME_ASC": return a.name.localeCompare(b.name, "pl");
        case "STATUS_ASC": return a.status.localeCompare(b.status);
        case "ID_ASC": return a.id - b.id;
      }
    });

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

      <form className="card form-grid form-grid--three" onSubmit={(e) => void submitCreateParking(e)}>
        <h3 style={{ margin: 0, gridColumn: "1 / -1" }}>Zgłoś nowy parking</h3>
        <label className="field">
          <span>Nazwa</span>
          <input value={createForm.name} onChange={(e) => updateCreateField("name", e.target.value)} required />
        </label>
        <label className="field">
          <span>Adres</span>
          <input value={createForm.address} onChange={(e) => updateCreateField("address", e.target.value)} required />
        </label>
        <label className="field">
          <span>Opis</span>
          <input value={createForm.description} onChange={(e) => updateCreateField("description", e.target.value)} />
        </label>
        <label className="field">
          <span>Strefa</span>
          <select value={createForm.zone} onChange={(e) => updateCreateField("zone", e.target.value as ParkingZone)}>
            <option value="ZONE_A">Strefa A</option>
            <option value="ZONE_B">Strefa B</option>
            <option value="ZONE_C">Strefa C</option>
          </select>
        </label>
        <label className="field">
          <span>Typ parkingu</span>
          <select value={createForm.parkingType} onChange={(e) => updateCreateField("parkingType", e.target.value)}>
            <option value="PRIVATE">Prywatny</option>
            <option value="PUBLIC">Publiczny</option>
            <option value="PARK_AND_RIDE">Park & Ride</option>
            <option value="UNDERGROUND">Podziemny</option>
          </select>
        </label>
        <label className="field">
          <span>Godziny</span>
          <input value={createForm.openingHours} onChange={(e) => updateCreateField("openingHours", e.target.value)} required />
        </label>
        <label className="field">
          <span>Szerokość geogr.</span>
          <input type="number" step="0.0001" value={createForm.latitude} onChange={(e) => updateCreateField("latitude", e.target.value)} required />
        </label>
        <label className="field">
          <span>Długość geogr.</span>
          <input type="number" step="0.0001" value={createForm.longitude} onChange={(e) => updateCreateField("longitude", e.target.value)} required />
        </label>
        <div className="form-grid__wide">
          <OwnerLocationPicker
            latitude={Number(createForm.latitude)}
            longitude={Number(createForm.longitude)}
            onChange={(latitude, longitude) => {
              updateCreateField("latitude", String(latitude));
              updateCreateField("longitude", String(longitude));
            }}
          />
        </div>
        <label className="field">
          <span>Liczba miejsc</span>
          <input type="number" min="1" value={createForm.totalSpots} onChange={(e) => updateCreateField("totalSpots", e.target.value)} required />
        </label>
        <label className="field">
          <span>Miejsca SCT</span>
          <input type="number" min="0" value={createForm.totalSctSpots} onChange={(e) => updateCreateField("totalSctSpots", e.target.value)} required />
        </label>
        <div className="form-actions form-grid__wide">
          <button type="submit" className="button" disabled={creating}>
            {creating ? "Zgłaszanie..." : "Zgłoś parking"}
          </button>
        </div>
      </form>

      <div className="card form-grid form-grid--three">
        <label className="field">
          <span>Filtr</span>
          <input
            value={parkingFilter}
            onChange={(e) => setParkingFilter(e.target.value)}
            placeholder="Szukaj po ID, nazwie, adresie albo statusie"
          />
        </label>
        <label className="field">
          <span>Sortowanie</span>
          <select value={parkingSort} onChange={(e) => setParkingSort(e.target.value as typeof parkingSort)}>
            <option value="ID_ASC">ID rosnąco</option>
            <option value="ID_DESC">ID malejąco</option>
            <option value="NAME_ASC">Nazwa A-Z</option>
            <option value="STATUS_ASC">Status</option>
          </select>
        </label>
      </div>

      <div className="results-grid">
        {visibleParkings.map((p) => (
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
        {!loading && visibleParkings.length === 0 ? (
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

          <form className="form-grid form-grid--three" onSubmit={(e) => void submitPrice(e)}>
            <h4 style={{ margin: 0, gridColumn: "1 / -1" }}>Cennik parkingu</h4>
            {(["firstHourPrice", "secondHourPrice", "thirdHourPrice", "nextHourPrice", "dailyPrice"] as const).map((field) => (
              <label className="field" key={field}>
                <span>{PRICE_LABELS[field]}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm[field]}
                  onChange={(e) => setPriceForm((current) => ({ ...current, [field]: e.target.value }))}
                />
              </label>
            ))}
            <div className="form-actions form-grid__wide">
              <button type="submit" className="button">Zapisz cennik</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
