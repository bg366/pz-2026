import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getReservations, createReservation, cancelReservation, initiatePayment, confirmPayment, cancelPayment, getAllActiveParkings } from "../api/client";
import type { Reservation, AuthState, ParkingSearchResult, UserVehicle } from "../api/types";

type Props = {
  auth: AuthState | null;
  initialParkingId?: number | null;
  activeVehicle?: UserVehicle | null;
};

type PaymentStep = {
  reservationId: number;
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

function statusLabel(status: Reservation["status"]): string {
  switch (status) {
    case "PENDING_PAYMENT": return "Oczekuje na platnosc";
    case "CONFIRMED": return "Aktywna";
    case "CANCELLED": return "Anulowana";
    case "COMPLETED": return "Zakonczona";
    case "EXPIRED": return "Wygasla";
  }
}

function statusClass(status: Reservation["status"]): string {
  switch (status) {
    case "PENDING_PAYMENT": return "badge";
    case "CONFIRMED": return "badge badge--success";
    case "CANCELLED": return "badge badge--danger";
    default: return "badge";
  }
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStartsAt(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 30 - (d.getMinutes() % 30));
  d.setSeconds(0, 0);
  return toLocalDateTimeInput(d);
}

function defaultEndsAt(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 90 - (d.getMinutes() % 30));
  d.setSeconds(0, 0);
  return toLocalDateTimeInput(d);
}

export default function Reservations({ auth, initialParkingId, activeVehicle }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [parkingOptions, setParkingOptions] = useState<ParkingSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [parkingLotId, setParkingLotId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState(activeVehicle?.registrationNumber ?? "");
  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [endsAt, setEndsAt] = useState(defaultEndsAt);
  const [submitting, setSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const confirmingPaynowRef = useRef(
    new URLSearchParams(window.location.search).has("paynow")
  );

  useEffect(() => {
    getAllActiveParkings()
      .then((list) => setParkingOptions(list.filter((p) => p.accessType === "BARRIER")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialParkingId != null) setParkingLotId(String(initialParkingId));
  }, [initialParkingId]);

  useEffect(() => {
    if (activeVehicle?.registrationNumber) setRegistrationNumber(activeVehicle.registrationNumber);
  }, [activeVehicle]);

  async function load() {
    if (!auth) return;
    try {
      const list = await getReservations();
      setReservations(list);
      if (!confirmingPaynowRef.current) {
        const pending = list.find((r) => r.status === "PENDING_PAYMENT" && r.paymentToken);
        if (pending?.paymentToken && !paymentStep) {
          setPaymentStep({
            reservationId: pending.id,
            parkingName: pending.parkingLotName,
            amount: pending.estimatedAmount,
            currency: pending.currency,
            token: pending.paymentToken
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania rezerwacji.");
    }
  }

  useEffect(() => { void load(); }, [auth]);

  // Handle return from Paynow (URL contains ?paynow=TOKEN)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paynowToken = params.get("paynow");
    if (!paynowToken || !auth) return;
    window.history.replaceState(null, "", window.location.pathname);
    confirmingPaynowRef.current = true;
    confirmPayment(paynowToken)
      .then(() => {
        setStatus("Płatność potwierdzona! Rezerwacja aktywna.");
        setPaymentStep(null);
      })
      .catch(() => {
        setError("Nie udało się potwierdzić płatności Paynow. Spróbuj ręcznie.");
      })
      .finally(() => {
        confirmingPaynowRef.current = false;
        void load();
      });
  }, [auth]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const created = await createReservation({
        parkingLotId: Number(parkingLotId),
        registrationNumber: registrationNumber.trim().toUpperCase(),
        startsAt: startsAt.length === 16 ? startsAt + ":00" : startsAt,
        endsAt: endsAt.length === 16 ? endsAt + ":00" : endsAt
      });
      setParkingLotId("");
      if (created.paymentToken) {
        setPaymentStep({
          reservationId: created.id,
          parkingName: created.parkingLotName,
          amount: created.estimatedAmount,
          currency: created.currency,
          token: created.paymentToken
        });
      } else {
        setStatus(`Rezerwacja #${created.id} potwierdzona: ${created.parkingLotName}.`);
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udalo sie utworzyc rezerwacji.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPayment() {
    if (!paymentStep) return;
    setPaymentProcessing(true);
    setError(null);
    try {
      // Try to initiate — may return Paynow redirect URL
      const initiated = await initiatePayment(paymentStep.token);
      if (initiated.redirectUrl) {
        window.location.href = initiated.redirectUrl;
        return;
      }
      // No redirect — local simulation: confirm directly
      await confirmPayment(paymentStep.token);
      setPaymentStep(null);
      setStatus(`Platnosc potwierdzona! Rezerwacja #${paymentStep.reservationId} aktywna.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad potwierdzania platnosci.");
    } finally {
      setPaymentProcessing(false);
    }
  }

  async function handleCancelPayment() {
    if (!paymentStep) return;
    setPaymentProcessing(true);
    setError(null);
    try {
      await cancelPayment(paymentStep.token);
      setPaymentStep(null);
      setStatus("Platnosc anulowana. Rezerwacja nie zostala potwierdzona.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad anulowania platnosci.");
    } finally {
      setPaymentProcessing(false);
    }
  }

  async function handleCancel(id: number) {
    setError(null);
    setStatus(null);
    try {
      await cancelReservation(id);
      setStatus(`Rezerwacja #${id} anulowana.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Blad anulowania rezerwacji.");
    }
  }

  if (!auth) {
    return (
      <div className="feedback feedback--empty">
        Zaloguj sie przez panel <strong>/login</strong>, aby zarzadzac rezerwacjami.
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Rezerwacje</h2>
        <p>Zarezerwuj miejsce parkingowe z szlabanem na wybrany termin.</p>
      </div>

      {paymentStep ? (
        <div className="card stack" style={{ border: "2px solid #2563eb" }}>
          <h3 style={{ margin: 0, color: "#1d4ed8" }}>Platnosc za rezerwacje</h3>
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
            <button type="button" className="button" onClick={() => void handleConfirmPayment()} disabled={paymentProcessing} style={{ background: "#16a34a", borderColor: "#16a34a" }}>
              {paymentProcessing ? "Przekierowanie..." : "Zaplac przez Paynow"}
            </button>
            <button type="button" className="button button--ghost" onClick={() => void handleCancelPayment()} disabled={paymentProcessing}>
              Anuluj rezerwacje
            </button>
          </div>
        </div>
      ) : null}

      {!paymentStep ? (
        <form className="card form-grid" onSubmit={(e) => void handleCreate(e)}>
          <h3 style={{ margin: 0 }}>Nowa rezerwacja</h3>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Rezerwacja mozliwa tylko dla parkingów z szlabanem (BARRIER).</p>

          {status ? <div className="feedback feedback--empty">{status}</div> : null}
          {error ? <div className="feedback feedback--error">{error}</div> : null}

          <label className="field">
            <span>Parking (z szlabanem)</span>
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
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
              placeholder="np. KR1234AB"
              required
              minLength={3}
              maxLength={20}
            />
          </label>

          <label className="field">
            <span>Poczatek</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </label>

          <label className="field">
            <span>Koniec</span>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
          </label>

          <div className="form-actions">
            <button type="submit" className="button" disabled={submitting}>
              {submitting ? "Tworzenie rezerwacji..." : "Zarezerwuj"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="card">
        <h3 style={{ margin: "0 0 16px" }}>Moje rezerwacje</h3>
        {reservations.length === 0 ? (
          <div className="feedback feedback--empty">Brak rezerwacji.</div>
        ) : (
          <div className="results-grid">
            {reservations.map((r) => (
              <article key={r.id} className="result-card">
                <div className="result-card__header">
                  <div>
                    <h3>{r.parkingLotName}</h3>
                    <p>{r.parkingLotAddress}</p>
                  </div>
                  <span className={statusClass(r.status)}>{statusLabel(r.status)}</span>
                </div>
                <dl className="details">
                  <div><dt>Rezerwacja</dt><dd>#{r.id}</dd></div>
                  <div><dt>Rejestracja</dt><dd>{r.registrationNumber}</dd></div>
                  <div><dt>Poczatek</dt><dd>{formatDateTime(r.startsAt)}</dd></div>
                  <div><dt>Koniec</dt><dd>{formatDateTime(r.endsAt)}</dd></div>
                  <div><dt>Szacowana kwota</dt><dd>
                    {r.estimatedAmount != null ? `${r.estimatedAmount.toFixed(2)} ${r.currency ?? "PLN"}` : "—"}
                  </dd></div>
                </dl>
                {(r.status === "CONFIRMED" || r.status === "PENDING_PAYMENT") ? (
                  <div className="result-card__actions">
                    {r.status === "PENDING_PAYMENT" && r.paymentToken ? (
                      <button
                        type="button"
                        className="button"
                        onClick={() => setPaymentStep({
                          reservationId: r.id,
                          parkingName: r.parkingLotName,
                          amount: r.estimatedAmount,
                          currency: r.currency,
                          token: r.paymentToken!
                        })}
                      >
                        Dokoncz platnosc
                      </button>
                    ) : null}
                    <button type="button" className="button button--ghost" onClick={() => void handleCancel(r.id)}>
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
