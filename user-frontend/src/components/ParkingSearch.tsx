import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import type { FormEvent } from "react";
import { searchParkings } from "../api/client";
import type { FuelType, EmissionStandard, ParkingSearchResult, UserVehicle } from "../api/types";

const ParkingMap = lazy(() => import("./ParkingMap"));

type ParkingSearchProps = {
  activeVehicle: UserVehicle | null;
};

const initialForm = {
  lat: "50.0615",
  lng: "19.9370",
  radiusKm: "5",
  name: "",
  zone: "",
  maxPricePerHour: "",
  durationMinutes: "",
  onlyAvailable: false,
  openNow: false,
  sort: "DISTANCE",
  fuelType: "" as FuelType | "",
  emissionStandard: "" as EmissionStandard | ""
};

export default function ParkingSearch({ activeVehicle }: ParkingSearchProps) {
  const [form, setForm] = useState(initialForm);
  const [results, setResults] = useState<ParkingSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  useEffect(() => {
    if (!activeVehicle) return;
    setForm((current) => ({
      ...current,
      fuelType: activeVehicle.fuelType,
      emissionStandard: activeVehicle.emissionStandard
    }));
  }, [activeVehicle]);

  const activeFilters = useMemo(() => {
    return [
      form.maxPricePerHour ? `Do ${form.maxPricePerHour} PLN/h` : null,
      form.name ? `Nazwa: ${form.name}` : null,
      form.zone ? `Strefa: ${form.zone}` : null,
      form.durationMinutes ? `Postój: ${form.durationMinutes} min` : null,
      form.onlyAvailable ? "Tylko wolne" : null,
      form.openNow ? "Otwarte teraz" : null,
      form.fuelType ? `Paliwo: ${form.fuelType}` : null,
      form.emissionStandard ? `Norma: ${form.emissionStandard}` : null
    ].filter(Boolean) as string[];
  }, [form]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchParkings({
        lat: form.lat,
        lng: form.lng,
        radiusKm: form.radiusKm,
        name: form.name || undefined,
        zone: form.zone || undefined,
        maxPricePerHour: form.maxPricePerHour || undefined,
        durationMinutes: form.durationMinutes || undefined,
        onlyAvailable: form.onlyAvailable || undefined,
        openNow: form.openNow || undefined,
        sort: form.sort,
        fuelType: form.fuelType || undefined,
        emissionStandard: form.emissionStandard || undefined
      });
      setResults(data);
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

  function buildGoogleMapsUrl(result: ParkingSearchResult) {
    return `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
  }

  function buildAppleMapsUrl(result: ParkingSearchResult) {
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
          <span>Nazwa parkingu</span>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="np. Wawel"
          />
        </label>

        <label className="field">
          <span>Strefa</span>
          <select
            value={form.zone}
            onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))}
          >
            <option value="">Wszystkie</option>
            <option value="ZONE_A">ZONE_A</option>
            <option value="ZONE_B">ZONE_B</option>
            <option value="ZONE_C">ZONE_C</option>
          </select>
        </label>

        <label className="field">
          <span>Maks. cena (PLN/h)</span>
          <input
            type="number"
            min="0"
            step="0.50"
            value={form.maxPricePerHour}
            onChange={(event) => setForm((current) => ({ ...current, maxPricePerHour: event.target.value }))}
            placeholder="np. 6.00"
          />
        </label>

        <label className="field">
          <span>Czas postoju (min)</span>
          <input
            type="number"
            min="1"
            value={form.durationMinutes}
            onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
            placeholder="np. 120"
          />
        </label>

        <label className="field">
          <span>Sortowanie</span>
          <select
            value={form.sort}
            onChange={(event) => setForm((current) => ({ ...current, sort: event.target.value }))}
          >
            <option value="DISTANCE">Odległość</option>
            <option value="PRICE">Cena</option>
            <option value="AVAILABLE_SPOTS">Wolne miejsca</option>
          </select>
        </label>

        <label className="field">
          <span>Typ paliwa</span>
          <select
            value={form.fuelType}
            onChange={(event) => setForm((current) => ({ ...current, fuelType: event.target.value as FuelType | "" }))}
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
              setForm((current) => ({ ...current, emissionStandard: event.target.value as EmissionStandard | "" }))
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
          <label className="inline-check">
            <input
              type="checkbox"
              checked={form.onlyAvailable}
              onChange={(event) => setForm((current) => ({ ...current, onlyAvailable: event.target.checked }))}
            />
            <span>Tylko z wolnymi miejscami</span>
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={form.openNow}
              onChange={(event) => setForm((current) => ({ ...current, openNow: event.target.checked }))}
            />
            <span>Otwarte teraz</span>
          </label>
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

      {results.length > 0 ? (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>{results.length} wyników</span>
          <button
            type="button"
            className={viewMode === "list" ? "button" : "button button--ghost"}
            onClick={() => setViewMode("list")}
          >
            Lista
          </button>
          <button
            type="button"
            className={viewMode === "map" ? "button" : "button button--ghost"}
            onClick={() => setViewMode("map")}
          >
            Mapa
          </button>
        </div>
      ) : null}

      {viewMode === "map" && results.length > 0 ? (
        <Suspense fallback={<div className="feedback feedback--empty">Ładowanie mapy...</div>}>
          <ParkingMap
            results={results}
            centerLat={Number(form.lat)}
            centerLng={Number(form.lng)}
          />
        </Suspense>
      ) : null}

      <div className="results-grid" style={viewMode === "map" ? { display: "none" } : undefined}>
        {results.map((result) => (
          <article key={result.id} className="result-card">
            <div className="result-card__header">
              <div>
                <h3>{result.name}</h3>
                <p>{result.address}</p>
              </div>
              <span className={result.sctAllowed ? "badge badge--success" : "badge badge--danger"}>
                {result.parkingPermission === "ALL_SPOTS"
                  ? "Wszystkie miejsca"
                  : result.parkingPermission === "SCT_SPOTS_ONLY"
                    ? "Tylko SCT"
                    : "Brak parkowania"}
              </span>
            </div>

            <dl className="details">
              <div><dt>Odległość</dt><dd>{result.distanceKm} km</dd></div>
              <div><dt>Strefa</dt><dd>{result.zone}</dd></div>
              <div><dt>Dostępne miejsca</dt><dd>{result.availableSpots}</dd></div>
              <div><dt>Miejsca regularne</dt><dd>{result.availableRegularSpots}</dd></div>
              <div><dt>Miejsca SCT</dt><dd>{result.availableSctSpots}</dd></div>
              <div><dt>Godziny</dt><dd>{result.openingHours}</dd></div>
              <div><dt>Status</dt><dd>{result.status}</dd></div>
              <div>
                <dt>Cena</dt>
                <dd>
                  {result.pricePerHour != null && result.currency
                    ? `${result.pricePerHour} ${result.currency}/h`
                    : "Brak taryfy"}
                </dd>
              </div>
              <div>
                <dt>Szacowany koszt</dt>
                <dd>
                  {result.predictedAmount != null && result.currency
                    ? `${result.predictedAmount} ${result.currency} (${result.predictedPricingMode})`
                    : "Podaj czas postoju"}
                </dd>
              </div>
              <div><dt>Typ parkingu</dt><dd>{result.parkingType}</dd></div>
              <div><dt>Status SCT</dt><dd>{result.permissionReason}</dd></div>
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
