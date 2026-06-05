import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import type { FormEvent } from "react";
import { searchParkings, startParkingSession, requestSessionPayment, initiateSessionPayment, confirmSessionPayment } from "../api/client";
import type { FuelType, EmissionStandard, ParkingSearchResult, UserVehicle, AuthState, ParkingSession } from "../api/types";

const FUEL_LABELS: Record<string, string> = { PETROL: "Benzyna", DIESEL: "Diesel", LPG: "LPG", HYBRID: "Hybryda", ELECTRIC: "Elektryczny" };
const EMISSION_LABELS: Record<string, string> = { EURO_1: "Euro 1", EURO_2: "Euro 2", EURO_3: "Euro 3", EURO_4: "Euro 4", EURO_5: "Euro 5", EURO_6: "Euro 6", ELECTRIC: "Elektryczny" };

const ParkingMap = lazy(() => import("./ParkingMap"));

type ParkingSearchProps = {
  auth: AuthState | null;
  activeVehicle: UserVehicle | null;
  activeSessions: ParkingSession[];
  onSessionsChange: () => void;
  onReserve: (parkingLotId: number) => void;
  onStartSession?: (parkingLotId: number) => void;
};

type PaymentPanel = {
  parkingLotId: number;
  sessionId: number;
  parkingName: string;
  amount: number | null;
  currency: string | null;
  token: string;
};

const initialForm = {
  lat: "50.0615",
  lng: "19.9370",
  radiusKm: "5",
  name: "",
  zone: "",
  maxPricePerHour: "",
  durationMinutes: "60",
  onlyAvailable: false,
  openNow: false,
  sort: "ID",
  fuelType: "" as FuelType | "",
  emissionStandard: "" as EmissionStandard | ""
};

function minDateTimeLocal(): string {
  const d = new Date(Date.now() + 5 * 60000);
  return d.toISOString().slice(0, 16);
}

function defaultEndDateTime(): string {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function billedHours(endAtLocal: string): number {
  const minutes = (new Date(endAtLocal).getTime() - Date.now()) / 60000;
  return Math.ceil(Math.max(minutes, 1) / 60);
}

export default function ParkingSearch({ auth, activeVehicle, activeSessions, onSessionsChange, onReserve, onStartSession }: ParkingSearchProps) {
  const [form, setForm] = useState(initialForm);
  const [results, setResults] = useState<ParkingSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Per-card expanded action state
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [entryPlate, setEntryPlate] = useState("");
  const [entryEndAt, setEntryEndAt] = useState(defaultEndDateTime);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySuccess, setEntrySuccess] = useState<string | null>(null);
  const [paymentPanel, setPaymentPanel] = useState<PaymentPanel | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeVehicle) return;
    setForm((current) => ({ ...current, fuelType: activeVehicle.fuelType, emissionStandard: activeVehicle.emissionStandard }));
  }, [activeVehicle]);

  const activeFilters = useMemo(() => {
    return [
      form.maxPricePerHour ? `Do ${form.maxPricePerHour} PLN/h` : null,
      form.name ? `Nazwa: ${form.name}` : null,
      form.zone ? `Strefa: ${form.zone}` : null,
      form.durationMinutes ? `Postoj: ${form.durationMinutes} min` : null,
      form.onlyAvailable ? "Tylko wolne" : null,
      form.openNow ? "Otwarte teraz" : null,
      form.fuelType ? `Paliwo: ${FUEL_LABELS[form.fuelType] ?? form.fuelType}` : null,
      form.emissionStandard ? `Norma: ${EMISSION_LABELS[form.emissionStandard] ?? form.emissionStandard}` : null
    ].filter(Boolean) as string[];
  }, [form]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setExpandedId(null);
    setPaymentPanel(null);
    try {
      const data = await searchParkings({
        lat: form.lat, lng: form.lng, radiusKm: form.radiusKm,
        name: form.name || undefined, zone: form.zone || undefined,
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
      setError(requestError instanceof Error ? requestError.message : "Nie udalo sie pobrac wynikow.");
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError("Geolokalizacja nie jest wspierana."); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => setForm((current) => ({ ...current, lat: position.coords.latitude.toFixed(4), lng: position.coords.longitude.toFixed(4) })),
      () => setError("Nie udalo sie pobrac Twojej lokalizacji.")
    );
  }

  function toggleExpand(id: number, accessType: "BARRIER" | "OPEN") {
    if (expandedId === id) {
      setExpandedId(null);
      setEntryError(null);
      setEntrySuccess(null);
      return;
    }
    setExpandedId(id);
    setEntryError(null);
    setEntrySuccess(null);
    setEntryPlate(activeVehicle?.registrationNumber ?? "");
    if (accessType === "OPEN") setEntryEndAt(defaultEndDateTime());
  }

  async function handleEntrySubmit(result: ParkingSearchResult) {
    setEntryError(null);
    setEntrySuccess(null);
    setEntrySubmitting(true);
    try {
      const req = {
        parkingLotId: result.id,
        registrationNumber: entryPlate.trim().toUpperCase(),
        ...(result.accessType === "OPEN" ? { plannedEndAt: new Date(entryEndAt).toISOString().replace("Z", "") } : {})
      };
      const session = await startParkingSession(req);
      onSessionsChange();
      if (session.status === "PAYMENT_PENDING" && session.paymentToken) {
        setEntrySuccess(null);
        setPaymentPanel({
          parkingLotId: result.id,
          sessionId: session.id,
          parkingName: result.name,
          amount: session.amount,
          currency: session.currency,
          token: session.paymentToken
        });
      } else {
        setEntrySuccess("Wjazd zarejestrowany. Oplacisz przy wyjezdzie.");
        setExpandedId(null);
      }
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Blad rejestracji wjazdu.");
    } finally {
      setEntrySubmitting(false);
    }
  }

  async function handleSessionPay(session: ParkingSession, parkingName: string) {
    setEntryError(null);
    try {
      const updated = await requestSessionPayment(session.id);
      if (updated.paymentToken) {
        setPaymentPanel({
          parkingLotId: session.parkingLotId,
          sessionId: updated.id,
          parkingName,
          amount: updated.amount,
          currency: updated.currency,
          token: updated.paymentToken
        });
      }
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Blad przygotowania platnosci.");
    }
  }

  async function handlePaymentConfirm() {
    if (!paymentPanel) return;
    setPaymentProcessing(true);
    setPaymentError(null);
    try {
      const initiated = await initiateSessionPayment(paymentPanel.token);
      if (initiated.redirectUrl) {
        window.location.href = initiated.redirectUrl;
        return;
      }
      await confirmSessionPayment(paymentPanel.token);
      setPaymentPanel(null);
      onSessionsChange();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Blad platnosci.");
    } finally {
      setPaymentProcessing(false);
    }
  }

  function buildGoogleMapsUrl(result: ParkingSearchResult) {
    return `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
  }

  function buildAppleMapsUrl(result: ParkingSearchResult) {
    return `https://maps.apple.com/?daddr=${result.latitude},${result.longitude}`;
  }

  function sctReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      "No vehicle SCT data was provided.": "Nie podano danych pojazdu do weryfikacji SCT.",
      "Vehicle meets SCT requirements.": "Pojazd spelnia wymagania SCT.",
      "Vehicle does not meet general SCT requirements; only designated SCT spots are available.": "Pojazd nie spelnia ogolnych wymagan SCT; dostepne sa tylko miejsca SCT.",
      "Vehicle does not meet SCT requirements and there are no designated SCT spots available.": "Pojazd nie spelnia wymagan SCT i brak miejsc SCT."
    };
    return labels[reason] ?? reason;
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Znajdz parking</h2>
        <p>Szukaj parkingów, filtruj po cenie i sprawdzaj wymagania SCT. Wybierz parking aby zobaczyc opcje platnosci.</p>
      </div>

      <form className="card form-grid form-grid--three" onSubmit={handleSubmit}>
        {activeVehicle ? (
          <div className="feedback feedback--empty form-grid__wide">
            Aktywny pojazd: {activeVehicle.brand} {activeVehicle.model}, {activeVehicle.registrationNumber}. Filtry SCT ustawione automatycznie.
          </div>
        ) : null}

        <label className="field"><span>Latitude</span>
          <input type="number" step="0.0001" value={form.lat} onChange={(e) => setForm((c) => ({ ...c, lat: e.target.value }))} required />
        </label>
        <label className="field"><span>Longitude</span>
          <input type="number" step="0.0001" value={form.lng} onChange={(e) => setForm((c) => ({ ...c, lng: e.target.value }))} required />
        </label>
        <label className="field"><span>Promien (km)</span>
          <input type="number" min="1" value={form.radiusKm} onChange={(e) => setForm((c) => ({ ...c, radiusKm: e.target.value }))} required />
        </label>
        <label className="field"><span>Nazwa parkingu</span>
          <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="np. Wawel" />
        </label>
        <label className="field"><span>Strefa</span>
          <select value={form.zone} onChange={(e) => setForm((c) => ({ ...c, zone: e.target.value }))}>
            <option value="">Wszystkie</option>
            <option value="ZONE_A">Strefa A</option>
            <option value="ZONE_B">Strefa B</option>
            <option value="ZONE_C">Strefa C</option>
          </select>
        </label>
        <label className="field"><span>Maks. cena (PLN/h)</span>
          <input type="number" min="0" step="0.50" value={form.maxPricePerHour} onChange={(e) => setForm((c) => ({ ...c, maxPricePerHour: e.target.value }))} placeholder="np. 6.00" />
        </label>
        <label className="field"><span>Czas postoju (min)</span>
          <input type="number" min="1" value={form.durationMinutes} onChange={(e) => setForm((c) => ({ ...c, durationMinutes: e.target.value }))} placeholder="np. 120" />
        </label>
        <label className="field"><span>Sortowanie</span>
          <select value={form.sort} onChange={(e) => setForm((c) => ({ ...c, sort: e.target.value }))}>
            <option value="DISTANCE">Odleglosc</option>
            <option value="ID">ID parkingu</option>
            <option value="PRICE">Cena</option>
            <option value="AVAILABLE_SPOTS">Wolne miejsca</option>
          </select>
        </label>
        <label className="field"><span>Typ paliwa</span>
          <select value={form.fuelType} onChange={(e) => setForm((c) => ({ ...c, fuelType: e.target.value as FuelType | "" }))}>
            <option value="">Bez filtra</option>
            <option value="PETROL">Benzyna</option>
            <option value="DIESEL">Diesel</option>
            <option value="LPG">LPG</option>
            <option value="HYBRID">Hybryda</option>
            <option value="ELECTRIC">Elektryczny</option>
          </select>
        </label>
        <label className="field"><span>Norma emisji</span>
          <select value={form.emissionStandard} onChange={(e) => setForm((c) => ({ ...c, emissionStandard: e.target.value as EmissionStandard | "" }))}>
            <option value="">Bez filtra</option>
            <option value="EURO_1">Euro 1</option>
            <option value="EURO_2">Euro 2</option>
            <option value="EURO_3">Euro 3</option>
            <option value="EURO_4">Euro 4</option>
            <option value="EURO_5">Euro 5</option>
            <option value="EURO_6">Euro 6</option>
            <option value="ELECTRIC">Elektryczny</option>
          </select>
        </label>
        <div className="form-actions">
          <label className="inline-check">
            <input type="checkbox" checked={form.onlyAvailable} onChange={(e) => setForm((c) => ({ ...c, onlyAvailable: e.target.checked }))} />
            <span>Tylko z wolnymi miejscami</span>
          </label>
          <label className="inline-check">
            <input type="checkbox" checked={form.openNow} onChange={(e) => setForm((c) => ({ ...c, openNow: e.target.checked }))} />
            <span>Otwarte teraz</span>
          </label>
          <button type="button" className="button button--ghost" onClick={useMyLocation}>Uzyj mojej lokalizacji</button>
          <button type="submit" className="button" disabled={loading}>{loading ? "Wyszukiwanie..." : "Szukaj parkingu"}</button>
        </div>
      </form>

      {activeFilters.length > 0 ? (
        <div className="filter-list" aria-label="Aktywne filtry">
          {activeFilters.map((filter) => <span key={filter} className="filter-chip">{filter}</span>)}
        </div>
      ) : null}

      {error ? <div className="feedback feedback--error">{error}</div> : null}
      {hasSearched && !loading && results.length === 0 && !error ? (
        <div className="feedback feedback--empty">Brak parkingow spelniajacych podane kryteria. Zwieksz promien albo poluzuj filtry.</div>
      ) : null}

      {/* Inline payment panel (shown above results) */}
      {paymentPanel ? (
        <div className="card stack" style={{ border: "2px solid #0891b2" }}>
          <h3 style={{ margin: 0, color: "#0e7490" }}>Platnosc za pobyt</h3>
          <p style={{ margin: 0, color: "#4b5563", fontSize: "14px" }}>Parking: <strong>{paymentPanel.parkingName}</strong></p>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#111827" }}>
            {paymentPanel.amount != null ? `${paymentPanel.amount.toFixed(2)} ${paymentPanel.currency ?? "PLN"}` : "0,00 PLN (brak taryfy)"}
          </p>
          {paymentError ? <div className="feedback feedback--error">{paymentError}</div> : null}
          <div className="form-actions">
            <button type="button" className="button" onClick={() => void handlePaymentConfirm()} disabled={paymentProcessing} style={{ background: "#0891b2", borderColor: "#0891b2" }}>
              {paymentProcessing ? "Przekierowanie..." : "Zaplac przez Paynow"}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setPaymentPanel(null)}>
              Anuluj
            </button>
          </div>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>{results.length} wynikow</span>
          <button type="button" className={viewMode === "list" ? "button" : "button button--ghost"} onClick={() => setViewMode("list")}>Lista</button>
          <button type="button" className={viewMode === "map" ? "button" : "button button--ghost"} onClick={() => setViewMode("map")}>Mapa</button>
        </div>
      ) : null}

      {viewMode === "map" && results.length > 0 ? (
        <Suspense fallback={<div className="feedback feedback--empty">Ladowanie mapy...</div>}>
          <ParkingMap results={results} centerLat={Number(form.lat)} centerLng={Number(form.lng)} />
        </Suspense>
      ) : null}

      <div className="results-grid" style={viewMode === "map" ? { display: "none" } : undefined}>
        {results.map((result) => {
          const mySession = activeSessions.find((s) => s.parkingLotId === result.id);
          const isExpanded = expandedId === result.id;
          const hours = result.accessType === "OPEN" && isExpanded && entryEndAt ? billedHours(entryEndAt) : null;

          return (
            <article key={result.id} className="result-card">
              <div className="result-card__header">
                <div>
                  <h3>{result.name}</h3>
                  <p>{result.address}</p>
                </div>
                <span className={result.sctAllowed ? "badge badge--success" : "badge badge--danger"}>
                  {result.parkingPermission === "ALL_SPOTS" ? "Wszystkie miejsca" : result.parkingPermission === "SCT_SPOTS_ONLY" ? "Tylko SCT" : "Brak parkowania"}
                </span>
              </div>

              {/* Active session banner */}
              {mySession ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#166534", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <span>Twoj pojazd <strong>{mySession.registrationNumber}</strong> jest na tym parkingu od {new Date(mySession.startedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}.</span>
                  {mySession.status === "ACTIVE" ? (
                    <button type="button" className="button" style={{ background: "#16a34a", borderColor: "#16a34a", fontSize: "12px", padding: "6px 14px" }} onClick={() => void handleSessionPay(mySession, result.name)}>
                      Zaplac i wyjedz
                    </button>
                  ) : (
                    <button type="button" className="button" style={{ background: "#0891b2", borderColor: "#0891b2", fontSize: "12px", padding: "6px 14px" }} onClick={() => setPaymentPanel({ parkingLotId: result.id, sessionId: mySession.id, parkingName: result.name, amount: mySession.amount, currency: mySession.currency, token: mySession.paymentToken! })}>
                      Dokonczplatnosc
                    </button>
                  )}
                </div>
              ) : null}

              <dl className="details">
                <div><dt>ID</dt><dd>#{result.id}</dd></div>
                <div><dt>Odleglosc</dt><dd>{result.distanceKm} km</dd></div>
                <div><dt>Strefa</dt><dd>{result.zone === "ZONE_A" ? "Strefa A" : result.zone === "ZONE_B" ? "Strefa B" : "Strefa C"}</dd></div>
                <div><dt>Dostepne miejsca</dt><dd>{result.availableSpots}</dd></div>
                <div><dt>Godziny</dt><dd>{result.openingHours}</dd></div>
                <div><dt>Cena</dt><dd>{result.pricePerHour != null && result.currency ? `${result.pricePerHour} ${result.currency}/h` : "Brak taryfy"}</dd></div>
                <div><dt>Szacowany koszt</dt><dd>{result.predictedAmount != null && result.currency ? `${result.predictedAmount} ${result.currency}` : "Podaj czas postoju"}</dd></div>
                <div><dt>Dostep</dt><dd>{result.accessType === "BARRIER" ? "Szlaban (rezerwacja opcjonalna)" : "Otwarty (oplata po wjezdzie)"}</dd></div>
                <div><dt>Status SCT</dt><dd>{sctReasonLabel(result.permissionReason)}</dd></div>
              </dl>

              <div className="result-card__actions">
                <a className="button button--ghost" href={buildGoogleMapsUrl(result)} target="_blank" rel="noreferrer">Google Maps</a>
                <a className="button button--link" href={buildAppleMapsUrl(result)} target="_blank" rel="noreferrer">Apple Maps</a>
                {result.accessType === "BARRIER" ? (
                  <>
                    <button type="button" className="button" onClick={() => onReserve(result.id)} disabled={result.availableSpots <= 0}>
                      Zarezerwuj
                    </button>
                    <button type="button" className={isExpanded ? "button" : "button button--ghost"} onClick={() => toggleExpand(result.id, "BARRIER")} disabled={result.availableSpots <= 0}>
                      {isExpanded ? "Zamknij" : "Wjedz teraz"}
                    </button>
                  </>
                ) : (
                  <button type="button" className={isExpanded ? "button" : "button button--ghost"} style={isExpanded ? { background: "#0891b2", borderColor: "#0891b2" } : undefined} onClick={() => toggleExpand(result.id, "OPEN")}>
                    {isExpanded ? "Zamknij" : "Rozpocznij pobyt"}
                  </button>
                )}
              </div>

              {/* Expanded action panel */}
              {isExpanded ? (
                <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "12px", paddingTop: "14px" }}>
                  {!auth ? (
                    <p style={{ fontSize: "13px", color: "#6b7280" }}>Zaloguj sie, aby zarejestrowac wjazd.</p>
                  ) : (
                    <>
                      {entryError ? <div className="feedback feedback--error" style={{ marginBottom: "10px" }}>{entryError}</div> : null}
                      {entrySuccess ? <div className="feedback feedback--empty" style={{ marginBottom: "10px" }}>{entrySuccess}</div> : null}

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <label className="field">
                          <span>{result.accessType === "BARRIER" ? "Numer rejestracyjny pojazdu" : "Numer rejestracyjny"}</span>
                          <input
                            value={entryPlate}
                            onChange={(e) => setEntryPlate(e.target.value.toUpperCase())}
                            placeholder="np. KR1234AB"
                            minLength={3}
                            maxLength={20}
                          />
                          {activeVehicle && entryPlate === activeVehicle.registrationNumber ? (
                            <span style={{ fontSize: "11px", color: "#16a34a", marginTop: "3px", display: "block" }}>
                              Twoj aktywny pojazd: {activeVehicle.brand} {activeVehicle.model}
                            </span>
                          ) : null}
                        </label>

                        {result.accessType === "OPEN" ? (
                          <label className="field">
                            <span>Godzina wyjazdu (godz. do)</span>
                            <input
                              type="datetime-local"
                              value={entryEndAt}
                              min={minDateTimeLocal()}
                              onChange={(e) => setEntryEndAt(e.target.value)}
                            />
                            {hours !== null ? (
                              <span style={{ fontSize: "12px", color: "#0891b2", marginTop: "3px", display: "block" }}>
                                Do zaplaty: <strong>{hours} {hours === 1 ? "godzina" : hours < 5 ? "godziny" : "godzin"}</strong> (zaokraglone w gore)
                              </span>
                            ) : null}
                          </label>
                        ) : (
                          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                            Czas liczymy od wjazdu. Oplacisz kwote przy wyjezdzie na podstawie rzeczywistego czasu parkowania.
                          </p>
                        )}

                        <button
                          type="button"
                          className="button"
                          style={{ background: result.accessType === "OPEN" ? "#0891b2" : "#1d4ed8", borderColor: result.accessType === "OPEN" ? "#0891b2" : "#1d4ed8" }}
                          disabled={entrySubmitting || !entryPlate.trim()}
                          onClick={() => void handleEntrySubmit(result)}
                        >
                          {entrySubmitting
                            ? "Przetwarzanie..."
                            : result.accessType === "OPEN"
                              ? "Oblicz cene i przejdz do platnosci"
                              : "Zarejestruj wjazd"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
