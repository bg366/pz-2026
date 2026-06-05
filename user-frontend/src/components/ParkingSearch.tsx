import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { UserVehicle } from "./UserAccount";

type FuelType = "" | "PETROL" | "DIESEL" | "LPG" | "HYBRID" | "ELECTRIC";
type EmissionStandard =
  | ""
  | "EURO_1"
  | "EURO_2"
  | "EURO_3"
  | "EURO_4"
  | "EURO_5"
  | "EURO_6"
  | "ELECTRIC";

type SearchResult = {
  id: number;
  name: string;
  address: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "TEMPORARILY_CLOSED";
  zone: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  sctAllowed: boolean;
  availableSpots: number;
  availableSctSpots: number;
  openingHours: string;
  pricePerHour: number | null;
  currency: string | null;
  parkingType: string;
};

const initialState = {
  lat: "50.0615",
  lng: "19.9370",
  radiusKm: "5",
  maxPricePerHour: "",
  fuelType: "" as FuelType,
  emissionStandard: "" as EmissionStandard
};

type ParkingSearchProps = {
  activeVehicle: UserVehicle | null;
};

export default function ParkingSearch({ activeVehicle }: ParkingSearchProps) {
  const [form, setForm] = useState(initialState);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!activeVehicle) {
      return;
    }

    setForm((current) => ({
      ...current,
      fuelType: activeVehicle.fuelType,
      emissionStandard: activeVehicle.emissionStandard
    }));
  }, [activeVehicle]);

  const activeFilters = useMemo(() => {
    return [
      form.maxPricePerHour ? `Do ${form.maxPricePerHour} PLN/h` : null,
      form.fuelType ? `Paliwo: ${form.fuelType}` : null,
      form.emissionStandard ? `Norma: ${form.emissionStandard}` : null
    ].filter(Boolean) as string[];
  }, [form.emissionStandard, form.fuelType, form.maxPricePerHour]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        lat: form.lat,
        lng: form.lng,
        radiusKm: form.radiusKm
      });

      if (form.maxPricePerHour) {
        params.set("maxPricePerHour", form.maxPricePerHour);
      }

      if (form.fuelType) {
        params.set("fuelType", form.fuelType);
      }

      if (form.emissionStandard) {
        params.set("emissionStandard", form.emissionStandard);
      }

      const response = await fetch(`/api/parking-lots/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as SearchResult[];
      setResults(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się pobrać wyników.");
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolokalizacja nie jest wspierana w tej przeglądarce.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          lat: position.coords.latitude.toFixed(4),
          lng: position.coords.longitude.toFixed(4)
        }));
      },
      () => setError("Nie udało się pobrać Twojej lokalizacji.")
    );
  }

  function buildGoogleMapsUrl(result: SearchResult) {
    return `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
  }

  function buildAppleMapsUrl(result: SearchResult) {
    return `https://maps.apple.com/?daddr=${result.latitude},${result.longitude}`;
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Znajdź parking</h2>
        <p>
          Szukaj parkingów w promieniu od wskazanej lokalizacji, filtruj po cenie i od razu
          sprawdzaj, czy Twój pojazd spełnia wymagania SCT.
        </p>
      </div>

      <form className="card form-grid form-grid--three" onSubmit={handleSubmit}>
        {activeVehicle ? (
          <div className="feedback feedback--empty form-grid__wide">
            Aktywny pojazd: {activeVehicle.brand} {activeVehicle.model}, {activeVehicle.registrationNumber}.
            Filtry SCT zostaly ustawione automatycznie.
          </div>
        ) : null}

        <label className="field">
          <span>Latitude</span>
          <input
            type="number"
            step="0.0001"
            value={form.lat}
            onChange={(event) => setForm((current) => ({ ...current, lat: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Longitude</span>
          <input
            type="number"
            step="0.0001"
            value={form.lng}
            onChange={(event) => setForm((current) => ({ ...current, lng: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Promień (km)</span>
          <input
            type="number"
            min="1"
            value={form.radiusKm}
            onChange={(event) => setForm((current) => ({ ...current, radiusKm: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Maks. cena (PLN/h)</span>
          <input
            type="number"
            min="0"
            step="0.50"
            value={form.maxPricePerHour}
            onChange={(event) =>
              setForm((current) => ({ ...current, maxPricePerHour: event.target.value }))
            }
            placeholder="np. 6.00"
          />
        </label>

        <label className="field">
          <span>Typ paliwa</span>
          <select
            value={form.fuelType}
            onChange={(event) =>
              setForm((current) => ({ ...current, fuelType: event.target.value as FuelType }))
            }
          >
            <option value="">Bez filtra</option>
            <option value="PETROL">PETROL</option>
            <option value="DIESEL">DIESEL</option>
            <option value="LPG">LPG</option>
            <option value="HYBRID">HYBRID</option>
            <option value="ELECTRIC">ELECTRIC</option>
          </select>
        </label>

        <label className="field">
          <span>Norma emisji</span>
          <select
            value={form.emissionStandard}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                emissionStandard: event.target.value as EmissionStandard
              }))
            }
          >
            <option value="">Bez filtra</option>
            <option value="EURO_1">EURO_1</option>
            <option value="EURO_2">EURO_2</option>
            <option value="EURO_3">EURO_3</option>
            <option value="EURO_4">EURO_4</option>
            <option value="EURO_5">EURO_5</option>
            <option value="EURO_6">EURO_6</option>
            <option value="ELECTRIC">ELECTRIC</option>
          </select>
        </label>

        <div className="form-actions">
          <button type="button" className="button button--ghost" onClick={useMyLocation}>
            Użyj mojej lokalizacji
          </button>
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Wyszukiwanie..." : "Szukaj parkingu"}
          </button>
        </div>
      </form>

      {activeFilters.length > 0 ? (
        <div className="filter-list" aria-label="Aktywne filtry">
          {activeFilters.map((filter) => (
            <span key={filter} className="filter-chip">
              {filter}
            </span>
          ))}
        </div>
      ) : null}

      {error ? <div className="feedback feedback--error">{error}</div> : null}

      {hasSearched && !loading && results.length === 0 && !error ? (
        <div className="feedback feedback--empty">
          Brak parkingów spełniających podane kryteria. Zwiększ promień albo poluzuj filtry.
        </div>
      ) : null}

      <div className="results-grid">
        {results.map((result) => (
          <article key={result.id} className="result-card">
            <div className="result-card__header">
              <div>
                <h3>{result.name}</h3>
                <p>{result.address}</p>
              </div>
              <span className={result.sctAllowed ? "badge badge--success" : "badge badge--danger"}>
                {result.sctAllowed ? "Wjazd dozwolony" : "Wjazd zakazany"}
              </span>
            </div>

            <dl className="details">
              <div>
                <dt>Odległość</dt>
                <dd>{result.distanceKm} km</dd>
              </div>
              <div>
                <dt>Strefa</dt>
                <dd>{result.zone}</dd>
              </div>
              <div>
                <dt>Dostępne miejsca</dt>
                <dd>{result.availableSpots}</dd>
              </div>
              <div>
                <dt>Miejsca SCT</dt>
                <dd>{result.availableSctSpots}</dd>
              </div>
              <div>
                <dt>Godziny</dt>
                <dd>{result.openingHours}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{result.status}</dd>
              </div>
              <div>
                <dt>Cena</dt>
                <dd>
                  {result.pricePerHour != null && result.currency
                    ? `${result.pricePerHour} ${result.currency}/h`
                    : "Brak taryfy"}
                </dd>
              </div>
              <div>
                <dt>Typ parkingu</dt>
                <dd>{result.parkingType}</dd>
              </div>
              <div>
                <dt>Status SCT</dt>
                <dd>{result.sctAllowed ? "Spełnia filtr" : "Nie spełnia filtra"}</dd>
              </div>
            </dl>

            <div className="result-card__actions">
              <a
                className="button button--ghost"
                href={buildGoogleMapsUrl(result)}
                target="_blank"
                rel="noreferrer"
              >
                Google Maps
              </a>
              <a
                className="button button--link"
                href={buildAppleMapsUrl(result)}
                target="_blank"
                rel="noreferrer"
              >
                Apple Maps
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
