import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getReservations, createReservation, cancelReservation } from "../api/client";
import type { Reservation, AuthState } from "../api/types";

type Props = {
  auth: AuthState | null;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function statusLabel(status: Reservation["status"]): string {
  switch (status) {
    case "CONFIRMED": return "Aktywna";
    case "CANCELLED": return "Anulowana";
    case "COMPLETED": return "Zakończona";
    case "EXPIRED": return "Wygasła";
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

export default function Reservations({ auth }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [parkingLotId, setParkingLotId] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [endsAt, setEndsAt] = useState(defaultEndsAt);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!auth) return;
    try {
      setReservations(await getReservations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania rezerwacji.");
    }
  }

  useEffect(() => { void load(); }, [auth]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setSubmitting(true);
    try {
      const created = await createReservation({
        parkingLotId: Number(parkingLotId),
        startsAt: new Date(startsAt).toISOString().replace("Z", ""),
        endsAt: new Date(endsAt).toISOString().replace("Z", "")
      });
      setStatus(`Rezerwacja #${created.id} potwierdzona: ${created.parkingLotName}.`);
      setParkingLotId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć rezerwacji.");
    } finally {
      setSubmitting(false);
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
      setError(err instanceof Error ? err.message : "Błąd anulowania rezerwacji.");
    }
  }

  if (!auth) {
    return (
      <div className="feedback feedback--empty">
        Zaloguj się, aby zarządzać rezerwacjami. Przejdź do zakładki <strong>Profil</strong>.
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Rezerwacje</h2>
        <p>Zarezerwuj miejsce parkingowe na wybrany termin.</p>
      </div>

      <form className="card form-grid" onSubmit={(e) => void handleCreate(e)}>
        <h3 style={{ margin: 0 }}>Nowa rezerwacja</h3>

        {status ? <div className="feedback feedback--empty">{status}</div> : null}
        {error ? <div className="feedback feedback--error">{error}</div> : null}

        <label className="field">
          <span>ID parkingu</span>
          <input
            type="number"
            min="1"
            value={parkingLotId}
            onChange={(e) => setParkingLotId(e.target.value)}
            placeholder="np. 1"
            required
          />
        </label>

        <label className="field">
          <span>Początek</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Koniec</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? "Rezerwowanie..." : "Zarezerwuj"}
          </button>
        </div>
      </form>

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
                  <span className={
                    r.status === "CONFIRMED" ? "badge badge--success"
                    : r.status === "CANCELLED" ? "badge badge--danger"
                    : "badge"
                  }>
                    {statusLabel(r.status)}
                  </span>
                </div>
                <dl className="details">
                  <div><dt>Rezerwacja</dt><dd>#{r.id}</dd></div>
                  <div><dt>Początek</dt><dd>{formatDateTime(r.startsAt)}</dd></div>
                  <div><dt>Koniec</dt><dd>{formatDateTime(r.endsAt)}</dd></div>
                  <div><dt>Utworzono</dt><dd>{formatDateTime(r.createdAt)}</dd></div>
                </dl>
                {r.status === "CONFIRMED" ? (
                  <div className="result-card__actions">
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => void handleCancel(r.id)}
                    >
                      Anuluj rezerwację
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
