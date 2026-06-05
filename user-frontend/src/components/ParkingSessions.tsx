import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getParkingSessions,
  startParkingSession,
  requestSessionPayment,
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
    case "PAYMENT_PENDING": return "Oczekuje na płatność";
    case "PAID": return "Opłacona";
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

export default function ParkingSessions({ auth, initialParkingId }: Props) {
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [parkingOptions, setParkingOptions] = useState<ParkingSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [parkingLotId, setParkingLotId] = useState("");
  const [plate, setPlate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/26");
  const [cardCvc, setCardCvc] = useState("123");

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
      setError(err instanceof Error ? err.message : "Błąd ładowania sesji.");
    }
  }

  useEffect(() => { void load(); }, [auth]);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      await startParkingSession({ parkingLotId: Number(parkingLotId), registrationNumber: plate.trim() });
      setParkingLotId("");
      setPlate("");
      setStatus("Sesja parkingowa rozpoczęta. Pamiętaj o opłaceniu przed wyjazdem.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się rozpocząć sesji.");
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
      setError(err instanceof Error ? err.message : "Błąd zamykania sesji.");
    }
  }

  async function handleConfirmPayment() {
    if (!paymentStep) return;
    setPaymentProcessing(true);
    setError(null);
    try {
      await confirmSessionPayment(paymentStep.token);
      setPaymentStep(null);
      setStatus("Płatność potwierdzona! Możesz opuścić parking.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd potwierdzania płatności.");
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
      setError(err instanceof Error ? err.message : "Błąd anulowania sesji.");
    }
  }

  if (!auth) {
    return (
      <div className="feedback feedback--empty">
        Zaloguj się, aby zarządzać sesjami parkingowymi. Przejdź do zakładki <strong>Profil</strong>.
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Sesje parkingowe</h2>
        <p>Wjedź bez rezerwacji i opłać pobyt przed wyjazdem. Działa dla parkingów otwartych i z szlabanem.</p>
      </div>

      {/* ── Krok płatności ── */}
      {paymentStep ? (
        <div className="card stack" style={{ border: "2px solid #0891b2" }}>
          <h3 style={{ margin: 0, color: "#0e7490" }}>Opłata za parking</h3>
          <p style={{ margin: 0, color: "#4b5563", fontSize: "14px" }}>
            Parking: <strong>{paymentStep.parkingName}</strong>
          </p>
          <p style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#111827" }}>
            {paymentStep.amount != null
              ? `${paymentStep.amount.toFixed(2)} ${paymentStep.currency ?? "PLN"}`
              : "0,00 PLN (brak taryfy)"}
          </p>

          {error ? <div className="feedback feedback--error">{error}</div> : null}

          <div className="form-grid form-grid--three" style={{ gap: "12px" }}>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Numer karty</span>
              <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} maxLength={19} />
            </label>
            <label className="field">
              <span>Data ważności</span>
              <input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} maxLength={5} />
            </label>
            <label className="field">
              <span>CVV</span>
              <input value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} maxLength={3} type="password" />
            </label>
          </div>

          <div style={{ fontSize: "12px", color: "#6b7280", background: "#f0f9ff", padding: "8px 12px", borderRadius: "6px" }}>
            Środowisko testowe — żadne pieniądze nie są pobierane.
            Karta testowa: <strong>4242 4242 4242 4242</strong>.
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="button"
              onClick={() => void handleConfirmPayment()}
              disabled={paymentProcessing}
              style={{ background: "#0891b2", borderColor: "#0891b2" }}
            >
              {paymentProcessing ? "Przetwarzanie..." : "Zapłać i wyjedź"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Formularz nowej sesji ── */}
      {!paymentStep ? (
        <form className="card form-grid" onSubmit={(e) => void handleStart(e)}>
          <h3 style={{ margin: 0 }}>Rozpocznij pobyt</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
            Dostępne dla wszystkich parkingów. Dla parkingów z szlabanem — wjazd bez rezerwacji, opłata przed wyjazdem.
          </p>

          {status ? <div className="feedback feedback--empty">{status}</div> : null}
          {error ? <div className="feedback feedback--error">{error}</div> : null}

          <label className="field">
            <span>Parking</span>
            <select value={parkingLotId} onChange={(e) => setParkingLotId(e.target.value)} required>
              <option value="">— wybierz parking —</option>
              {parkingOptions.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name} ({p.address})</option>
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

          <div className="form-actions">
            <button type="submit" className="button" disabled={submitting}>
              {submitting ? "Rozpoczynanie..." : "Rozpocznij pobyt"}
            </button>
          </div>
        </form>
      ) : null}

      {/* ── Lista sesji ── */}
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
                  <div><dt>Początek</dt><dd>{formatDateTime(s.startedAt)}</dd></div>
                  {s.endedAt ? <div><dt>Koniec</dt><dd>{formatDateTime(s.endedAt)}</dd></div> : null}
                  <div><dt>Czas pobytu</dt><dd>{durationLabel(s.startedAt, s.endedAt)}</dd></div>
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
                      Zapłać i wyjedź
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
                      Dokończ płatność
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
