import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import UserAccount from "./components/UserAccount";
import Reservations from "./components/Reservations";
import ParkingSessions from "./components/ParkingSessions";
import Notifications from "./components/Notifications";
import OwnerPanel from "./components/OwnerPanel";
import VehicleCheck from "./components/VehicleCheck";
import AuthPage from "./components/AuthPage";
import type { AuthMode } from "./components/AuthPage";
import {
  readStoredAuth, getNotifications, getParkingSessions, getVehicles,
  searchParkings, startParkingSession, requestSessionPayment,
  initiateSessionPayment, clearAuth
} from "./api/client";
import type {
  AuthState, UserVehicle, ParkingSession, ParkingSearchResult,
  FuelType, EmissionStandard
} from "./api/types";

const CivicMap = lazy(() => import("./components/CivicMap"));

// ---- Types ----------------------------------------------------------------

type View = "parking" | "vehicle" | "profile" | "reservations" | "sessions" | "notifications" | "owner";

const VIEW_ROUTES: Record<View, string> = {
  parking: "/wyszukiwarka", vehicle: "/sprawdz-auto", profile: "/profil",
  reservations: "/rezerwacje", sessions: "/sesje",
  notifications: "/powiadomienia", owner: "/moje-parkingi"
};
const AUTH_ROUTES: Record<AuthMode, string> = { login: "/login", register: "/register" };

function viewFromPath(p: string): View {
  return (Object.entries(VIEW_ROUTES) as [View, string][]).find(([, r]) => p === r || p === `${r}/`)?.[0] ?? "parking";
}
function authModeFromPath(p: string): AuthMode | null {
  return (Object.entries(AUTH_ROUTES) as [AuthMode, string][]).find(([, r]) => p === r || p === `${r}/`)?.[0] ?? null;
}
function readStoredDark(): boolean {
  try { return localStorage.getItem("kp-theme") === "dark"; } catch { return false; }
}

// ---- Search form defaults -------------------------------------------------

const DEFAULT_FORM = {
  lat: "50.0615", lng: "19.9370", radiusKm: "5",
  name: "", zone: "", maxPricePerHour: "", durationMinutes: "60",
  onlyAvailable: false, openNow: false, sort: "DISTANCE",
  fuelType: "" as FuelType | "", emissionStandard: "" as EmissionStandard | ""
};

const ZONE_LABELS: Record<string, string> = { ZONE_A: "Strefa A", ZONE_B: "Strefa B", ZONE_C: "Strefa C" };

function defaultEndAt(): string {
  const d = new Date(Date.now() + 60 * 60000); d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}
function billedHours(endAt: string) {
  return Math.ceil(Math.max((new Date(endAt).getTime() - Date.now()) / 60000, 1) / 60);
}
function minDtLocal(): string { return new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16); }

function sctBadge(r: ParkingSearchResult) {
  if (r.parkingPermission === "ALL_SPOTS") return { cls: "kp-stat kp-stat--ok", label: "✓ Wszystkie miejsca" };
  if (r.parkingPermission === "SCT_SPOTS_ONLY") return { cls: "kp-stat kp-stat--warn", label: "⚠ Tylko SCT" };
  return { cls: "kp-stat kp-stat--err", label: "✗ Brak wjazdu" };
}

// ---- Icons (inline Lucide paths) ------------------------------------------

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: d }} />
  );
}
const IC = {
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun:  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  nav: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  locate: '<line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
};

// =========================================================================
// Main App
// =========================================================================

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [authMode, setAuthMode] = useState<AuthMode | null>(() => authModeFromPath(window.location.pathname));
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());
  const [activeVehicle, setActiveVehicle] = useState<UserVehicle | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeSessions, setActiveSessions] = useState<ParkingSession[]>([]);
  const [darkMode, setDarkMode] = useState(readStoredDark);

  // Search state
  const [form, setForm] = useState(DEFAULT_FORM);
  const [results, setResults] = useState<ParkingSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Entry / payment state
  const [entryPlate, setEntryPlate] = useState("");
  const [entryEndAt, setEntryEndAt] = useState(defaultEndAt);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySuccess, setEntrySuccess] = useState<string | null>(null);
  const [paymentPanel, setPaymentPanel] = useState<{
    sessionId: number; parkingLotId: number; parkingName: string;
    amount: number | null; currency: string | null; token: string;
  } | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Overlay panel (non-parking views) — init open if we loaded on a non-parking route
  const [overlayOpen, setOverlayOpen] = useState(() => {
    const v = viewFromPath(window.location.pathname);
    return v !== "parking" && authModeFromPath(window.location.pathname) === null;
  });
  const [reservationParkingId, setReservationParkingId] = useState<number | null>(null);
  const [sessionParkingId, setSessionParkingId] = useState<number | null>(null);

  // Dark mode sync
  useEffect(() => {
    document.documentElement.setAttribute("data-mode", darkMode ? "dark" : "light");
    try { localStorage.setItem("kp-theme", darkMode ? "dark" : "light"); } catch { /* */ }
  }, [darkMode]);

  // Routing
  function navigate(v: View) {
    setView(v);
    setAuthMode(null);
    if (v === "parking") { setOverlayOpen(false); }
    else { setOverlayOpen(true); }
    const p = VIEW_ROUTES[v];
    if (window.location.pathname !== p) window.history.pushState(null, "", p);
  }
  function openAuth(m: AuthMode) {
    setAuthMode(m);
    const p = AUTH_ROUTES[m];
    if (window.location.pathname !== p) window.history.pushState(null, "", p);
  }
  function closeAuth() {
    setAuthMode(null);
    const p = VIEW_ROUTES[view];
    if (window.location.pathname !== p) window.history.pushState(null, "", p);
  }
  useEffect(() => {
    if (window.location.pathname === "/") window.history.replaceState(null, "", VIEW_ROUTES[view]);
    const handler = () => {
      const v = viewFromPath(window.location.pathname);
      const a = authModeFromPath(window.location.pathname);
      setView(v); setAuthMode(a);
      setOverlayOpen(v !== "parking" && a === null);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Data loading
  useEffect(() => {
    if (!auth) { setUnreadCount(0); setActiveSessions([]); return; }
    const loadAll = async () => {
      try { setUnreadCount((await getNotifications()).filter((n) => !n.read).length); } catch { /* */ }
      try { setActiveSessions((await getParkingSessions()).filter((s) => s.status === "ACTIVE" || s.status === "PAYMENT_PENDING")); } catch { /* */ }
      try { setActiveVehicle((await getVehicles()).find((v) => v.active) ?? null); } catch { /* */ }
    };
    void loadAll();
    const t = setInterval(async () => {
      try { setUnreadCount((await getNotifications()).filter((n) => !n.read).length); } catch { /* */ }
    }, 60000);
    return () => clearInterval(t);
  }, [auth]);

  function refreshSessions() {
    getParkingSessions()
      .then((all) => setActiveSessions(all.filter((s) => s.status === "ACTIVE" || s.status === "PAYMENT_PENDING")))
      .catch(() => {});
  }

  // Vehicle sync to form
  useEffect(() => {
    if (!activeVehicle) return;
    setForm((c) => ({ ...c, fuelType: activeVehicle.fuelType, emissionStandard: activeVehicle.emissionStandard }));
  }, [activeVehicle]);

  // Search
  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setSearchError(null); setHasSearched(true);
    setSelectedId(null); setPaymentPanel(null);
    try {
      setResults(await searchParkings({
        lat: form.lat, lng: form.lng, radiusKm: form.radiusKm,
        name: form.name || undefined, zone: form.zone || undefined,
        maxPricePerHour: form.maxPricePerHour || undefined,
        durationMinutes: form.durationMinutes || undefined,
        onlyAvailable: form.onlyAvailable || undefined,
        openNow: form.openNow || undefined,
        sort: form.sort,
        fuelType: form.fuelType || undefined,
        emissionStandard: form.emissionStandard || undefined,
      }));
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Nie udało się pobrać wyników.");
    } finally { setLoading(false); }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setSearchError("Geolokalizacja nie jest wspierana."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((c) => ({ ...c, lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) })),
      () => setSearchError("Nie udało się pobrać lokalizacji.")
    );
  }

  const selectedResult = useMemo(() => results.find((r) => r.id === selectedId) ?? null, [results, selectedId]);
  const mySession = useMemo(() =>
    selectedResult ? activeSessions.find((s) => s.parkingLotId === selectedResult.id) ?? null : null,
    [activeSessions, selectedResult]
  );

  function selectResult(id: number) {
    if (id === selectedId) { setSelectedId(null); return; }
    setSelectedId(id);
    setEntryPlate(activeVehicle?.registrationNumber ?? "");
    setEntryEndAt(defaultEndAt());
    setEntryError(null); setEntrySuccess(null);
  }

  async function handleEntry() {
    if (!selectedResult) return;
    setEntryError(null); setEntrySuccess(null); setEntrySubmitting(true);
    try {
      const req = {
        parkingLotId: selectedResult.id,
        registrationNumber: entryPlate.trim().toUpperCase(),
        ...(selectedResult.accessType === "OPEN" ? { plannedEndAt: entryEndAt.length === 16 ? entryEndAt + ":00" : entryEndAt } : {})
      };
      const session = await startParkingSession(req);
      refreshSessions();
      if (session.status === "PAYMENT_PENDING" && session.paymentToken) {
        setPaymentPanel({
          sessionId: session.id, parkingLotId: selectedResult.id,
          parkingName: selectedResult.name, amount: session.amount,
          currency: session.currency, token: session.paymentToken
        });
      } else {
        setEntrySuccess("Wjazd zarejestrowany. Opłacisz przy wyjeździe.");
      }
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Błąd rejestracji wjazdu.");
    } finally { setEntrySubmitting(false); }
  }

  async function handleSessionPay(session: ParkingSession) {
    try {
      const updated = await requestSessionPayment(session.id);
      if (updated.paymentToken) {
        setPaymentPanel({
          sessionId: updated.id, parkingLotId: session.parkingLotId,
          parkingName: selectedResult?.name ?? "",
          amount: updated.amount, currency: updated.currency, token: updated.paymentToken
        });
      }
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Błąd przygotowania płatności.");
    }
  }

  async function handlePaymentConfirm() {
    if (!paymentPanel) return;
    setPaymentProcessing(true); setPaymentError(null);
    try {
      const r = await initiateSessionPayment(paymentPanel.token);
      if (r.redirectUrl) { window.location.href = r.redirectUrl; return; }
      setPaymentPanel(null); refreshSessions();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Błąd płatności.");
    } finally { setPaymentProcessing(false); }
  }

  // ---- Auth page (full-screen) -------------------------------------------
  if (authMode) {
    return (
      <AuthPage
        mode={authMode} onModeChange={openAuth} onBack={closeAuth}
        onAuthChange={(a) => { setAuth(a); closeAuth(); }}
        darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)}
      />
    );
  }

  // =========================================================================
  // Map-first layout
  // =========================================================================
  const hours = selectedResult?.accessType === "OPEN" && entryEndAt ? billedHours(entryEndAt) : null;

  return (
    <div className="kp-root">
      {/* Full-screen map */}
      <Suspense fallback={null}>
        <CivicMap
          results={results}
          centerLat={Number(form.lat)} centerLng={Number(form.lng)}
          selectedId={selectedId} onSelect={selectResult}
          darkMode={darkMode}
        />
      </Suspense>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="kp-topbar">
        <div className="kp-lockup">
          <div className="kp-tile"><span>P</span></div>
          <div className="kp-word">
            <b>Kraków</b>
            <small>Parkowanie miejskie</small>
          </div>
        </div>

        <nav className="kp-topnav">
          {(["vehicle", "reservations", "sessions", "notifications", "profile"] as View[]).map((v) => {
            const labels: Record<string, string> = {
              vehicle: "Sprawdź auto", reservations: "Rezerwacje",
              sessions: "Sesje", notifications: "Powiadomienia", profile: "Profil"
            };
            return (
              <button key={v} type="button"
                className={"kp-navbtn" + (view === v && overlayOpen ? " is-active" : "")}
                onClick={() => navigate(v)}
              >
                {labels[v]}
                {v === "notifications" && unreadCount > 0 ? (
                  <span className="kp-notif-dot">{unreadCount}</span>
                ) : null}
              </button>
            );
          })}
          {auth?.roles.includes("PARKING_OWNER") ? (
            <button type="button"
              className={"kp-navbtn" + (view === "owner" && overlayOpen ? " is-active" : "")}
              onClick={() => navigate("owner")}>
              Moje parkingi
            </button>
          ) : null}
        </nav>

        <div className="kp-topbar__right">
          <button type="button" className="kp-icon-btn"
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? "Tryb jasny" : "Tryb ciemny"}>
            <Icon d={darkMode ? IC.sun : IC.moon} />
          </button>
          {auth ? (
            <>
              <span className="kp-user-badge">{auth.email}</span>
              <button type="button" className="kp-icon-btn" title="Wyloguj"
                onClick={() => { clearAuth(); setAuth(null); setActiveVehicle(null); }}>
                <Icon d={IC.logout} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="kp-btn kp-btn--ghost" onClick={() => openAuth("login")}>Zaloguj się</button>
              <button type="button" className="kp-btn kp-btn--primary" onClick={() => openAuth("register")}>Zarejestruj się</button>
            </>
          )}
        </div>
      </div>

      {/* ── Left panel: parking search ──────────────────────────────────── */}
      <div className="kp-panel">
        <div className="kp-panel__head">
          <div className="kp-panel__title-row">
            <h1 className="kp-panel__title">Znajdź parking</h1>
            <button type="button" className={"kp-icon-btn kp-icon-btn--sm" + (showFilters ? " is-active" : "")}
              onClick={() => setShowFilters((s) => !s)} title="Filtry">
              <Icon d={IC.filter} size={16} />
            </button>
          </div>
          <p className="kp-panel__sub">
            {hasSearched ? `${results.length} wyników · Kraków` : "Kraków i okolice"}
          </p>

          <form onSubmit={handleSearch}>
            <div className="kp-searchwrap">
              <Icon d={IC.search} size={16} />
              <input className="kp-search" placeholder="Szukaj nazwy lub adresu…"
                value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
            </div>

            {showFilters ? (
              <div className="kp-filters">
                <div className="kp-filter-row">
                  <label className="kp-field">
                    <span>Szerokość (lat)</span>
                    <input type="number" step="0.0001" value={form.lat}
                      onChange={(e) => setForm((c) => ({ ...c, lat: e.target.value }))} />
                  </label>
                  <label className="kp-field">
                    <span>Długość (lng)</span>
                    <input type="number" step="0.0001" value={form.lng}
                      onChange={(e) => setForm((c) => ({ ...c, lng: e.target.value }))} />
                  </label>
                </div>
                <div className="kp-filter-row">
                  <label className="kp-field">
                    <span>Promień (km)</span>
                    <input type="number" min="1" value={form.radiusKm}
                      onChange={(e) => setForm((c) => ({ ...c, radiusKm: e.target.value }))} />
                  </label>
                  <label className="kp-field">
                    <span>Maks. cena (PLN/h)</span>
                    <input type="number" min="0" step="0.5" placeholder="bez limitu"
                      value={form.maxPricePerHour}
                      onChange={(e) => setForm((c) => ({ ...c, maxPricePerHour: e.target.value }))} />
                  </label>
                </div>
                <div className="kp-filter-row">
                  <label className="kp-field">
                    <span>Strefa</span>
                    <select value={form.zone} onChange={(e) => setForm((c) => ({ ...c, zone: e.target.value }))}>
                      <option value="">Wszystkie</option>
                      <option value="ZONE_A">Strefa A</option>
                      <option value="ZONE_B">Strefa B</option>
                      <option value="ZONE_C">Strefa C</option>
                    </select>
                  </label>
                  <label className="kp-field">
                    <span>Postój (min)</span>
                    <input type="number" min="1" value={form.durationMinutes}
                      onChange={(e) => setForm((c) => ({ ...c, durationMinutes: e.target.value }))} />
                  </label>
                </div>
                <div className="kp-filter-row">
                  <label className="kp-field">
                    <span>Paliwo</span>
                    <select value={form.fuelType} onChange={(e) => setForm((c) => ({ ...c, fuelType: e.target.value as FuelType | "" }))}>
                      <option value="">Bez filtra</option>
                      <option value="PETROL">Benzyna</option>
                      <option value="DIESEL">Diesel</option>
                      <option value="LPG">LPG</option>
                      <option value="HYBRID">Hybryda</option>
                      <option value="ELECTRIC">Elektryczny</option>
                    </select>
                  </label>
                  <label className="kp-field">
                    <span>Norma emisji</span>
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
                </div>
                <div className="kp-filter-checks">
                  <label className="kp-check">
                    <input type="checkbox" checked={form.onlyAvailable}
                      onChange={(e) => setForm((c) => ({ ...c, onlyAvailable: e.target.checked }))} />
                    Tylko wolne miejsca
                  </label>
                  <label className="kp-check">
                    <input type="checkbox" checked={form.openNow}
                      onChange={(e) => setForm((c) => ({ ...c, openNow: e.target.checked }))} />
                    Otwarte teraz
                  </label>
                </div>
              </div>
            ) : null}

            <div className="kp-chips">
              <button type="button" className={"kp-chip" + (form.onlyAvailable ? " is-on" : "")}
                onClick={() => setForm((c) => ({ ...c, onlyAvailable: !c.onlyAvailable }))}>
                Tylko wolne
              </button>
              <button type="button" className={"kp-chip" + (form.zone === "ZONE_A" ? " is-on" : "")}
                onClick={() => setForm((c) => ({ ...c, zone: c.zone === "ZONE_A" ? "" : "ZONE_A" }))}>
                Strefa A
              </button>
              <button type="button" className={"kp-chip" + (form.zone === "ZONE_B" ? " is-on" : "")}
                onClick={() => setForm((c) => ({ ...c, zone: c.zone === "ZONE_B" ? "" : "ZONE_B" }))}>
                Strefa B
              </button>
              <button type="button" className={"kp-chip" + (form.zone === "ZONE_C" ? " is-on" : "")}
                onClick={() => setForm((c) => ({ ...c, zone: c.zone === "ZONE_C" ? "" : "ZONE_C" }))}>
                Strefa C
              </button>
              <button type="button" className="kp-chip" onClick={useMyLocation}>
                <Icon d={IC.locate} size={13} /> Moja lokalizacja
              </button>
            </div>

            <button type="submit" className="kp-btn kp-btn--primary kp-btn--full" disabled={loading}>
              {loading ? "Wyszukiwanie…" : "Szukaj parkingu"}
            </button>
          </form>
        </div>

        {searchError ? <div className="kp-feedback kp-feedback--err">{searchError}</div> : null}
        {hasSearched && !loading && results.length === 0 && !searchError ? (
          <div className="kp-feedback">Brak wyników. Poluzuj filtry albo zwiększ promień.</div>
        ) : null}

        {activeVehicle ? (
          <div className="kp-vehicle-banner">
            <Icon d={IC.car} size={14} />
            <span>{activeVehicle.brand} {activeVehicle.model} · {activeVehicle.registrationNumber}</span>
          </div>
        ) : null}

        <div className="kp-list">
          {results.map((r) => {
            const isSel = r.id === selectedId;
            const hasSession = activeSessions.some((s) => s.parkingLotId === r.id);
            const badge = sctBadge(r);
            return (
              <button key={r.id} type="button"
                className={"kp-result" + (isSel ? " is-sel" : "") + (hasSession ? " has-session" : "")}
                onClick={() => selectResult(r.id)}>
                <div className="kp-result__top">
                  <span className="kp-result__name">{r.name}</span>
                  <span className="kp-result__price">
                    {r.pricePerHour != null ? `${r.pricePerHour} zł` : "—"}<small>/h</small>
                  </span>
                </div>
                <div className="kp-result__addr">{r.address} · {r.distanceKm} km</div>
                <div className="kp-result__meta">
                  <span className="kp-dot" style={{ background: badge.cls.includes("ok") ? "var(--c-green)" : badge.cls.includes("warn") ? "var(--c-amber)" : "var(--c-red)" }} />
                  <span>{r.availableSpots > 0 ? `${r.availableSpots} wolnych` : "Brak miejsc"}</span>
                  <span className="kp-sep">·</span>
                  <span>{ZONE_LABELS[r.zone] ?? r.zone}</span>
                  <span className="kp-sep">·</span>
                  <span>{r.accessType === "BARRIER" ? "Szlaban" : "Otwarty"}</span>
                  {hasSession ? <span className="kp-session-dot" title="Masz aktywną sesję" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Detail sheet (selected parking) ─────────────────────────────── */}
      {selectedResult && !overlayOpen ? (
        <div className="kp-detail" key={selectedResult.id}>
          <div className="kp-detail__head">
            <div>
              <h2 className="kp-detail__name">{selectedResult.name}</h2>
              <p className="kp-detail__addr">{selectedResult.address}</p>
            </div>
            <button type="button" className="kp-icon-btn kp-icon-btn--sm" onClick={() => setSelectedId(null)}>
              <Icon d={IC.x} size={16} />
            </button>
          </div>

          {/* Active session banner */}
          {mySession ? (
            <div className="kp-session-banner">
              <span>Twój pojazd <strong>{mySession.registrationNumber}</strong> tu parkuje od{" "}
                {new Date(mySession.startedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}.
              </span>
              {mySession.status === "ACTIVE" ? (
                <button type="button" className="kp-btn kp-btn--sm kp-btn--primary"
                  onClick={() => void handleSessionPay(mySession)}>
                  Zapłać i wyjedź
                </button>
              ) : (
                <button type="button" className="kp-btn kp-btn--sm kp-btn--primary"
                  onClick={() => setPaymentPanel({
                    sessionId: mySession.id, parkingLotId: mySession.parkingLotId,
                    parkingName: selectedResult.name, amount: mySession.amount,
                    currency: mySession.currency, token: mySession.paymentToken!
                  })}>
                  Dokończ płatność
                </button>
              )}
            </div>
          ) : null}

          {/* Payment panel */}
          {paymentPanel && paymentPanel.parkingLotId === selectedResult.id ? (
            <div className="kp-payment">
              <div className="kp-payment__amount">
                {paymentPanel.amount != null
                  ? `${paymentPanel.amount.toFixed(2)} ${paymentPanel.currency ?? "PLN"}`
                  : "0,00 PLN"}
              </div>
              <p className="kp-payment__label">💳 Do zapłaty za pobyt</p>
              {paymentError ? <div className="kp-feedback kp-feedback--err">{paymentError}</div> : null}
              <div className="kp-detail__actions">
                <button type="button" className="kp-btn kp-btn--primary kp-btn--full"
                  disabled={paymentProcessing} onClick={() => void handlePaymentConfirm()}>
                  {paymentProcessing ? "Przekierowanie…" : "Zapłać przez Paynow"}
                </button>
                <button type="button" className="kp-btn kp-btn--ghost" onClick={() => setPaymentPanel(null)}>Anuluj</button>
              </div>
            </div>
          ) : null}

          <dl className="kp-detail__grid">
            <div><dt>Cena</dt><dd>{selectedResult.pricePerHour != null ? `${selectedResult.pricePerHour} zł/h` : "Brak taryfy"}</dd></div>
            <div><dt>Wolne miejsca</dt><dd>{selectedResult.availableSpots > 0 ? selectedResult.availableSpots : "Brak"}</dd></div>
            <div><dt>Strefa</dt><dd>{ZONE_LABELS[selectedResult.zone] ?? selectedResult.zone}</dd></div>
            <div><dt>Godziny</dt><dd>{selectedResult.openingHours}</dd></div>
            <div><dt>Szac. koszt</dt><dd>{selectedResult.predictedAmount != null && selectedResult.currency ? `${selectedResult.predictedAmount} ${selectedResult.currency}` : "—"}</dd></div>
            <div><dt>Dostęp</dt><dd>{selectedResult.accessType === "BARRIER" ? "Szlaban" : "Otwarty"}</dd></div>
          </dl>

          <div className="kp-detail__sct">
            <span className={sctBadge(selectedResult).cls}>{sctBadge(selectedResult).label}</span>
          </div>

          {/* Entry form */}
          {!mySession && !paymentPanel ? (
            <div className="kp-entry">
              {!auth ? (
                <p className="kp-entry__hint">
                  <button type="button" className="kp-link" onClick={() => openAuth("login")}>Zaloguj się</button>
                  {" "}aby zarejestrować wjazd.
                </p>
              ) : (
                <>
                  {entryError ? <div className="kp-feedback kp-feedback--err">{entryError}</div> : null}
                  {entrySuccess ? <div className="kp-feedback kp-feedback--ok">{entrySuccess}</div> : null}
                  <label className="kp-field">
                    <span>Numer rejestracyjny</span>
                    <input value={entryPlate}
                      onChange={(e) => setEntryPlate(e.target.value.toUpperCase())}
                      placeholder="np. KR1234AB" />
                  </label>
                  {selectedResult.accessType === "OPEN" ? (
                    <label className="kp-field">
                      <span>Planowany wyjazd</span>
                      <input type="datetime-local" value={entryEndAt} min={minDtLocal()}
                        onChange={(e) => setEntryEndAt(e.target.value)} />
                      {hours !== null ? (
                        <span className="kp-field__hint">
                          Do zapłaty: {hours} {hours === 1 ? "godzina" : hours < 5 ? "godziny" : "godzin"} (zaokrąglone w górę)
                        </span>
                      ) : null}
                    </label>
                  ) : (
                    <p className="kp-entry__hint">
                      Czas liczymy od wjazdu. Opłacisz przy wyjeździe na podstawie rzeczywistego czasu parkowania.
                    </p>
                  )}
                  <div className="kp-detail__actions" style={{ marginTop: "10px" }}>
                    <button type="button" className="kp-btn kp-btn--primary kp-btn--full"
                      disabled={entrySubmitting || !entryPlate.trim()}
                      onClick={() => void handleEntry()}>
                      {entrySubmitting ? "Przetwarzanie…"
                        : selectedResult.accessType === "OPEN" ? "Oblicz cenę i przejdź do płatności"
                        : "Zarejestruj wjazd"}
                    </button>
                    {selectedResult.accessType === "BARRIER" ? (
                      <button type="button" className="kp-btn kp-btn--ghost"
                        onClick={() => { setReservationParkingId(selectedResult.id); navigate("reservations"); }}>
                        Zarezerwuj
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : null}

          <div className="kp-detail__nav">
            <a className="kp-btn kp-btn--ghost"
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedResult.latitude},${selectedResult.longitude}`}
              target="_blank" rel="noreferrer">
              <Icon d={IC.nav} size={14} /> Google Maps ↗
            </a>
          </div>
        </div>
      ) : null}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      {!overlayOpen ? (
        <div className="kp-legend">
          <span><span className="kp-dot" style={{ background: "var(--c-green)" }} /> Wolny wjazd</span>
          <span><span className="kp-dot" style={{ background: "var(--c-amber)" }} /> Tylko SCT</span>
          <span><span className="kp-dot" style={{ background: "var(--c-red)" }} /> Brak wjazdu</span>
        </div>
      ) : null}

      {/* ── Overlay panel (non-parking views) ──────────────────────────── */}
      {overlayOpen ? (
        <div className="kp-overlay">
          <div className="kp-overlay__bar">
            <button type="button" className="kp-btn kp-btn--ghost kp-btn--sm"
              onClick={() => { setOverlayOpen(false); navigate("parking"); }}>
              ← Mapa
            </button>
            <span className="eyebrow" style={{ color: "var(--text-eyebrow)" }}>
              {({
                parking: "", vehicle: "Sprawdź auto", profile: "Profil i pojazdy",
                reservations: "Rezerwacje", sessions: "Sesje",
                notifications: "Powiadomienia", owner: "Moje parkingi"
              } as Record<View, string>)[view] ?? ""}
            </span>
          </div>
          <div className="kp-overlay__body">
            {view === "vehicle" ? (
              <VehicleCheck activeVehicle={activeVehicle} />
            ) : view === "reservations" ? (
              <Reservations auth={auth} initialParkingId={reservationParkingId} activeVehicle={activeVehicle} />
            ) : view === "sessions" ? (
              <ParkingSessions auth={auth} initialParkingId={sessionParkingId} />
            ) : view === "notifications" ? (
              <Notifications auth={auth} />
            ) : view === "owner" ? (
              <OwnerPanel auth={auth} />
            ) : (
              <UserAccount auth={auth} onAuthChange={setAuth} onActiveVehicleChange={setActiveVehicle} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
