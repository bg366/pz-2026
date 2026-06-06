import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getParkingSessions,
  startParkingSession,
  requestSessionPayment,
  initiateSessionPayment,
  confirmSessionPayment,
  cancelParkingSession,
  getAllActiveParkings
} from "../api/client";
import type { ParkingSession, AuthState, ParkingSearchResult } from "../api/types";

type Props = {
  auth: AuthState | null;
  initialParkingId?: number | null;
};

type PaymentStep = {
  sessionId: number;
  parkingName: string;
  amount: number | null;
  currency: string | null;
  token: string;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function durationLabel(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt) : new Date();
  const minutes = Math.floor((end.getTime() - new Date(startedAt).getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function statusLabel(status: ParkingSession["status"]): string {
  switch (status) {
    case "ACTIVE": return "Aktywna";
    case "PAYMENT_PENDING": return "Oczekuje na platnosc";
    case "PAID": return "Oplacona";
    case "CANCELLED": return "Anulowana";
  }
}

function statusClass(status: ParkingSession["status"]): string {
  switch (status) {
    case "ACTIVE": return "badge badge--success";
    case "PAYMENT_PENDING": return "badge";
    case "PAID": return "badge badge--success";
    case "CANCELLED": return "badge badge--danger";
  }
}

function minDateTimeLocal(): string {
  const d = new Date(Date.now() + 5 * 60000);
  return d.toISOString().slice(0, 16);
}

function defaultEndDateTime(): string {
  const d = new Date(Date.now() + 60 * 60000);
  d.setMinutes(0, 0, 0);
  if (d.getTime() < Date.now() + 5 * 60000) d.setTime(Date.now() + 65 * 60000);
  return d.toISOString().slice(0, 16);
}

function billedHours(endAtLocal: string): number {
  const minutes = (new Date(endAtLocal).getTime() - Date.now()) / 60000;
  return Math.ceil(Math.max(minutes, 1) / 60);
}

export default function ParkingSessions({ auth, initialParkingId }: Props) {
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [parkingOptions, setParkingOptions] = useState<ParkingSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [parkingLotId, setParkingLotId] = useState("");
  const [plate, setPlate] = useState("");
  const [plannedEndAt, setPlannedEndAt] = useState(defaultEndDateTime);
  const [submitting, setSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const selectedParking = parkingOptions.find((p) => String(p.id) === parkingLotId) ?? null;
  const isOpen = selectedParking?.accessType === "OPEN";
  const hours = isOpen && plannedEndAt ? billedHours(plannedEndAt) : null;

  useEffect(() => {
    getAllActiveParkings()
      .then((list) => setParkingOptions(list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialParkingId != null) setParkingLotId(String(initialParkingId));
  }, [initialParkingId]);

  async function load() {
    if (!auth) return;
    try {
      const list = await getParkingSessions();
      setSessions(list);
      const pending = list.find((s) => s.status === "PAYMENT_PENDING" && s.paymentToken);
      if (pending?.paymentToken && !paymentStep) {
        setPaymentStep({
          sessionId: pending.id,
          parkingName: pending.parkingLotName,
          amount: pending.amount,
          currency: pending.currency,
          token: pending.paymentToken
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad ladowania sesji.");
    }
  }

  useEffect(() => { void load(); }, [auth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("session_paynow");
    if (!token || !auth) return;
    window.history.replaceState(null, "", window.location.pathname);
    confirmSessionPayment(token)
      .then(() => { setStatus("Platnosc Paynow potwierdzona! Mozesz opuscic parking."); void load(); })
      .catch(() => { setError("Nie udalo sie potwierdzic platnosci Paynow."); });
  }, [auth]);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const req = {
        parkingLotId: Number(parkingLotId),
        registrationNumber: plate.trim(),
        ...(isOpen && plannedEndAt ? { plannedEndAt: plannedEndAt.length === 16 ? plannedEndAt + ":00" : plannedEndAt } : {})
      };
      const newSession = await startParkingSession(req);
      setParkingLotId("");
      setPlate("");
      setPlannedEndAt(defaultEndDateTime());
      if (newSession.status === "PAYMENT_PENDING" && newSession.paymentToken) {
        setPaymentStep({
          sessionId: newSession.id,
          parkingName: newSession.parkingLotName,
          amount: newSession.amount,
          currency: newSession.currency,
          token: newSession.paymentToken
        });
      } else {
        setStatus("Sesja parkingowa rozpoczeta. Pamietaj o oplaceniu przed wyjazdem.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udalo sie rozpoczac sesji.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestPayment(sessionId: number, parkingName: string) {
    setError(null);
    try {
      const updated = await requestSessionPayment(sessionId);
      if (updated.paymentToken) {
        setPaymentStep({
          sessionId: updated.id,
          parkingName,
          amount: updated.amount,
          currency: updated.currency,
          token: updated.paymentToken
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad zamykania sesji.");
    }
  }

  async function handleConfirmPayment() {
    if (!paymentStep) return;
    setPaymentProcessing(true);
    setError(null);
    try {
      const initiated = await initiateSessionPayment(paymentStep.token);
      if (initiated.redirectUrl) {
        window.location.href = initiated.redirectUrl;
        return;
      }
      await confirmSessionPayment(paymentStep.token);
      setPaymentStep(null);
      setStatus("Platnosc potwierdzona! Mozesz opuscic parking.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad potwierdzania platnosci.");
    } finally {
      setPaymentProcessing(false);
    }
  }

  async function handleCancel(sessionId: number) {
    setError(null);
    try {
      await cancelParkingSession(sessionId);
      setStatus("Sesja anulowana.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad anulowania sesji.");
    }
  }

  if (!auth) {
    return (
      <div className="feedback feedback--empty">
        Zaloguj sie, aby zarzadzac sesjami parkingowymi. Przejdz do zakladki <strong>Profil</strong>.
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Sesje parkingowe</h2>
        <p>Wjedz bez rezerwacji i oplac pobyt przed wyjazdem. Dziala dla parkingów otwartych i z szlabanem.</p>
      </div>

      {paymentStep ? (
        <div className="card stack" style={{ border: "2px solid #0891b2" }}>
          <h3 style={{ margin: 0, color: "#0e7490" }}>Oplata za parking</h3>
          <p style={{ margin: 0, color: "#4b5563", fontSize: "14px" }}>
            Parking: <strong>{paymentStep.parkingName}</strong>
          </p>
          <p style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#111827" }}>
            {paymentStep.amount != null
              ? `${paymentStep.amount.toFixed(2)} ${paymentStep.currency ?? "PLN"}`
              : "0,00 PLN (brak taryfy)"}
          </p>
          {error ? <div className="feedback feedback--error">{error}</div> : null}
          <div className="form-actions">
            <button
              type="button"
              className="button"
              onClick={() => void handleConfirmPayment()}
              disabled={paymentProcessing}
              style={{ background: "#0891b2", borderColor: "#0891b2" }}
            >
              {paymentProcessing ? "Przekierowanie..." : "Zaplac przez Paynow"}
            </button>
          </div>
        </div>
      ) : null}

      {!paymentStep ? (
        <form className="card form-grid" onSubmit={(e) => void handleStart(e)}>
          <h3 style={{ margin: 0 }}>Rozpocznij pobyt</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
            Dla parkingów z szlabanem — wjazd bez rezerwacji, oplata przed wyjazdem.
            Dla parkingów otwartych — wybierz planowana godzine wyjazdu i oplac z gory.
          </p>

          {status ? <div className="feedback feedback--empty">{status}</div> : null}
          {error ? <div className="feedback feedback--error">{error}</div> : null}

          <label className="field">
            <span>Parking</span>
            <select value={parkingLotId} onChange={(e) => setParkingLotId(e.target.value)} required>
              <option value="">— wybierz parking —</option>
              {parkingOptions.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} ({p.address}) — {p.accessType === "OPEN" ? "otwarty" : "szlaban"}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Numer rejestracyjny</span>
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="np. KR1234AB"
              required
              minLength={3}
              maxLength={20}
            />
          </label>

          {isOpen ? (
            <label className="field">
              <span>Godzina wyjazdu (godz. do)</span>
              <input
                type="datetime-local"
                value={plannedEndAt}
                min={minDateTimeLocal()}
                onChange={(e) => setPlannedEndAt(e.target.value)}
                required
              />
              {hours !== null ? (
                <span style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px", display: "block" }}>
                  Czas pobytu: <strong>{hours} {hours === 1 ? "godzina" : hours < 5 ? "godziny" : "godzin"}</strong> (zaokraglone w gore)
                </span>
              ) : null}
            </label>
          ) : null}

          {isOpen ? (
            <div style={{ fontSize: "12px", color: "#0891b2", background: "#f0f9ff", padding: "8px 12px", borderRadius: "6px" }}>
              Godzina od ustawiana jest automatycznie. Oplata liczona od teraz do wybranej godziny wyjazdu, zaokraglona w gore do pelnych godzin.
            </div>
          ) : null}

          <div className="form-actions">
            <button type="submit" className="button" disabled={submitting}>
              {submitting ? "Rozpoczynanie..." : isOpen ? "Oblicz cene i przejdz do platnosci" : "Rozpocznij pobyt"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="card">
        <h3 style={{ margin: "0 0 16px" }}>Moje sesje</h3>
        {sessions.length === 0 ? (
          <div className="feedback feedback--empty">Brak sesji parkingowych.</div>
        ) : (
          <div className="results-grid">
            {sessions.map((s) => (
              <article key={s.id} className="result-card">
                <div className="result-card__header">
                  <div>
                    <h3>{s.parkingLotName}</h3>
                    <p>{s.parkingLotAddress}</p>
                  </div>
                  <span className={statusClass(s.status)}>{statusLabel(s.status)}</span>
                </div>
                <dl className="details">
                  <div><dt>Rejestracja</dt><dd>{s.registrationNumber}</dd></div>
                  <div><dt>Poczatek</dt><dd>{formatDateTime(s.startedAt)}</dd></div>
                  {s.endedAt ? <div><dt>{s.status === "PAID" || s.status === "PAYMENT_PENDING" ? "Planowany koniec" : "Koniec"}</dt><dd>{formatDateTime(s.endedAt)}</dd></div> : null}
                  {s.endedAt ? <div><dt>Czas pobytu</dt><dd>{durationLabel(s.startedAt, s.endedAt)}</dd></div> : null}
                  {s.amount != null ? (
                    <div><dt>Kwota</dt><dd>{s.amount.toFixed(2)} {s.currency ?? "PLN"}</dd></div>
                  ) : null}
                </dl>
                {s.status === "ACTIVE" ? (
                  <div className="result-card__actions">
                    <button
                      type="button"
                      className="button"
                      style={{ background: "#0891b2", borderColor: "#0891b2" }}
                      onClick={() => void handleRequestPayment(s.id, s.parkingLotName)}
                    >
                      Zaplac i wyjezdzaj
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => void handleCancel(s.id)}
                    >
                      Anuluj
                    </button>
                  </div>
                ) : s.status === "PAYMENT_PENDING" && s.paymentToken ? (
                  <div className="result-card__actions">
                    <button
                      type="button"
                      className="button"
                      style={{ background: "#0891b2", borderColor: "#0891b2" }}
                      onClick={() => setPaymentStep({
                        sessionId: s.id,
                        parkingName: s.parkingLotName,
                        amount: s.amount,
                        currency: s.currency,
                        token: s.paymentToken!
                      })}
                    >
                      Dokoncz platnosc
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => void handleCancel(s.id)}
                    >
                      Anuluj
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
