import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getParkingLots,
  getParkingLot,
  deleteParkingLot,
  updateOccupancy,
  updateSpots,
  updateParkingLotPrice,
  updateZonePrice,
  assignParkingLotOwner
} from "../api/client";
import type { ParkingLot, PriceForm, SpotFormEntry } from "../api/types";
import ParkingLotForm, { type ParkingLotPayload } from "../components/ParkingLotForm";
import { styles } from "../styles";

type Props = { token: string };

const spotCategories: SpotFormEntry["category"][] = ["REGULAR", "EV", "DISABLED", "SCT_READY"];

const emptyPriceForm: PriceForm = {
  firstHourPrice: "0",
  secondHourPrice: "0",
  thirdHourPrice: "0",
  nextHourPrice: "0",
  dailyPrice: "0"
};

function formatSpotForms(spots: ParkingLot["spots"]): SpotFormEntry[] {
  return spotCategories.map((category) => {
    const match = spots.find((s) => s.category === category);
    return { category, total: String(match?.total ?? 0), occupied: String(match?.occupied ?? 0) };
  });
}

function mapParkingToPayload(parking: ParkingLot): ParkingLotPayload {
  return {
    id: parking.id,
    name: parking.name,
    address: parking.address,
    description: parking.description ?? "",
    status: parking.status,
    zone: parking.zone,
    latitude: String(parking.latitude),
    longitude: String(parking.longitude),
    totalSpots: String(parking.totalSpots),
    occupiedSpots: parking.occupiedSpots,
    totalSctSpots: String(parking.totalSctSpots),
    occupiedSctSpots: parking.occupiedSctSpots,
    openingHours: parking.openingHours,
    parkingType: parking.parkingType
  };
}

function mapPriceToForm(price: ParkingLot["price"]): PriceForm {
  if (!price) return emptyPriceForm;
  return {
    firstHourPrice: String(price.firstHourPrice),
    secondHourPrice: String(price.secondHourPrice),
    thirdHourPrice: String(price.thirdHourPrice),
    nextHourPrice: String(price.nextHourPrice),
    dailyPrice: String(price.dailyPrice)
  };
}

export default function ParkingLotsView({ token }: Props) {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selected, setSelected] = useState<ParkingLot | null>(null);
  const [editing, setEditing] = useState<ParkingLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [occupancyValue, setOccupancyValue] = useState("0");
  const [spotForms, setSpotForms] = useState<SpotFormEntry[]>(formatSpotForms([]));
  const [priceForm, setPriceForm] = useState<PriceForm>(emptyPriceForm);
  const [ownerIdInput, setOwnerIdInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      setParkingLots(await getParkingLots(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania parkingów.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetails(id: number) {
    try {
      const parking = await getParkingLot(id, token);
      setSelected(parking);
      setOccupancyValue(String(parking.occupiedSpots));
      setSpotForms(formatSpotForms(parking.spots));
      setPriceForm(mapPriceToForm(parking.price));
      setOwnerIdInput(parking.ownerId != null ? String(parking.ownerId) : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania szczegółów.");
    }
  }

  useEffect(() => { void loadAll(); }, []);

  async function handleDelete(id: number) {
    if (!window.confirm("Usunąć wybrany parking?")) return;
    setError(null);
    try {
      await deleteParkingLot(id, token);
      setStatus("Parking usunięty.");
      setSelected(null);
      setEditing(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd usuwania.");
    }
  }

  async function handleParkingSaved(savedParking: ParkingLot) {
    setStatus(`Zapisano parking: ${savedParking.name}.`);
    setEditing(null);
    await loadAll();
    await loadDetails(savedParking.id);
  }

  async function submitOccupancy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      const updated = await updateOccupancy(selected.id, Number(occupancyValue), token);
      setStatus("Zaktualizowano obłożenie.");
      setSelected(updated);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd aktualizacji obłożenia.");
    }
  }

  async function submitSpots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      const updated = await updateSpots(
        selected.id,
        spotForms.map((s) => ({ category: s.category, total: Number(s.total), occupied: Number(s.occupied) })),
        token
      );
      setStatus("Zapisano konfigurację kategorii miejsc.");
      setSelected(updated);
      setSpotForms(formatSpotForms(updated.spots));
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu kategorii.");
    }
  }

  async function submitPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    const isPrivate = selected.parkingType === "PRIVATE" || selected.price?.parkingLotId != null;
    try {
      if (isPrivate) {
        await updateParkingLotPrice(selected.id, priceForm, token);
        setStatus("Zapisano cennik parkingu.");
      } else {
        await updateZonePrice(selected.zone, priceForm, token);
        setStatus("Zapisano cennik strefy.");
      }
      await loadDetails(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu cennika.");
    }
  }

  async function submitOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      const ownerId = ownerIdInput.trim() ? Number(ownerIdInput) : null;
      const updated = await assignParkingLotOwner(selected.id, ownerId, token);
      setStatus(ownerId ? `Przypisano właściciela (ID: ${ownerId}).` : "Usunięto właściciela.");
      setSelected(updated);
      setOwnerIdInput(updated.ownerId != null ? String(updated.ownerId) : "");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd przypisania właściciela.");
    }
  }

  return (
    <div style={styles.grid}>
      {/* LEFT — list */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Parkingi</h2>
            <p style={styles.helper}>Wybierz parking, aby zobaczyć szczegóły i konfigurację.</p>
          </div>
          <button type="button" style={styles.button} onClick={() => void loadAll()}>Odśwież</button>
        </div>

        {status ? <div style={{ ...styles.feedback, ...styles.success }}>{status}</div> : null}
        {error ? <div style={{ ...styles.feedback, ...styles.error }}>{error}</div> : null}

        {loading ? (
          <p style={styles.helper}>Ładowanie...</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Parking</th>
                  <th style={styles.th}>Strefa</th>
                  <th style={styles.th}>Obłożenie</th>
                  <th style={styles.th}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {parkingLots.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>
                      <strong>{p.name}</strong>
                      <div style={styles.helper}>{p.address}</div>
                      <div style={styles.helper}>{p.status} — {p.openingHours}</div>
                      {p.ownerEmail ? <div style={styles.helper}>Właściciel: {p.ownerEmail}</div> : null}
                    </td>
                    <td style={styles.td}><span style={styles.badge}>{p.zone}</span></td>
                    <td style={styles.td}>
                      {p.occupiedSpots} / {p.totalSpots}
                      <div style={styles.helper}>SCT: {p.occupiedSctSpots} / {p.totalSctSpots}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button type="button" style={styles.subtleButton} onClick={() => void loadDetails(p.id)}>Szczegóły</button>
                        <button type="button" style={styles.subtleButton} onClick={() => setEditing(p)}>Edytuj</button>
                        <button type="button" style={styles.dangerButton} onClick={() => void handleDelete(p.id)}>Usuń</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RIGHT — form + details */}
      <div style={styles.stack}>
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>{editing ? "Edytuj parking" : "Dodaj parking"}</h2>
              <p style={styles.helper}>Formularz tworzenia i edycji danych parkingu.</p>
            </div>
            {editing ? (
              <button type="button" style={styles.subtleButton} onClick={() => setEditing(null)}>Anuluj edycję</button>
            ) : null}
          </div>
          <ParkingLotForm
            initialData={editing ? mapParkingToPayload(editing) : null}
            authToken={token}
            onSaved={(savedParking) => void handleParkingSaved(savedParking)}
          />
        </section>

        {selected ? (
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.sectionTitle}>Szczegóły: {selected.name}</h2>
              <span style={styles.badge}>{selected.status}</span>
            </div>

            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <strong>Dostępne</strong>
                <div style={styles.helper}>{selected.totalSpots - selected.occupiedSpots} miejsc</div>
              </div>
              <div style={styles.summaryCard}>
                <strong>Miejsca SCT</strong>
                <div style={styles.helper}>{selected.occupiedSctSpots} / {selected.totalSctSpots}</div>
              </div>
              <div style={styles.summaryCard}>
                <strong>Godziny</strong>
                <div style={styles.helper}>{selected.openingHours}</div>
              </div>
              <div style={styles.summaryCard}>
                <strong>Właściciel</strong>
                <div style={styles.helper}>{selected.ownerEmail ?? "brak"}</div>
              </div>
              <div style={styles.summaryCard}>
                <strong>Cennik</strong>
                <div style={styles.helper}>{selected.price ? "skonfigurowany" : "brak"}</div>
              </div>
              <div style={styles.summaryCard}>
                <strong>Kategorie</strong>
                <div style={styles.helper}>{selected.spots.length}</div>
              </div>
            </div>

            {/* Occupancy */}
            <form style={{ ...styles.formGrid, marginTop: "16px" }} onSubmit={(e) => void submitOccupancy(e)}>
              <div style={styles.formRow}>
                <label style={styles.field}>
                  <span style={styles.label}>Obłożenie</span>
                  <input style={styles.input} type="number" min="0" max={selected.totalSpots} value={occupancyValue} onChange={(e) => setOccupancyValue(e.target.value)} />
                </label>
              </div>
              <button type="submit" style={styles.button}>Zapisz obłożenie</button>
            </form>

            {/* Spots */}
            <form style={{ ...styles.formGrid, marginTop: "16px" }} onSubmit={(e) => void submitSpots(e)}>
              <h3 style={{ margin: 0 }}>Kategorie miejsc</h3>
              {spotForms.map((spot, idx) => (
                <div style={styles.formRow} key={spot.category}>
                  <label style={styles.field}>
                    <span style={styles.label}>{spot.category} total</span>
                    <input style={styles.input} type="number" min="0" value={spot.total}
                      onChange={(e) => setSpotForms((cur) => cur.map((s, i) => i === idx ? { ...s, total: e.target.value } : s))} />
                  </label>
                  <label style={styles.field}>
                    <span style={styles.label}>{spot.category} zajęte</span>
                    <input style={styles.input} type="number" min="0" value={spot.occupied}
                      onChange={(e) => setSpotForms((cur) => cur.map((s, i) => i === idx ? { ...s, occupied: e.target.value } : s))} />
                  </label>
                </div>
              ))}
              <button type="submit" style={styles.button}>Zapisz kategorie</button>
            </form>

            {/* Price */}
            <form style={{ ...styles.formGrid, marginTop: "16px" }} onSubmit={(e) => void submitPrice(e)}>
              <h3 style={{ margin: 0 }}>Cennik</h3>
              <div style={styles.summaryCard}>
                <strong>Zakres</strong>
                <div style={styles.helper}>
                  {selected.parkingType === "PRIVATE" || selected.price?.parkingLotId
                    ? "indywidualny cennik parkingu"
                    : `cennik strefy ${selected.zone}`}
                </div>
              </div>
              {(["firstHourPrice", "secondHourPrice", "thirdHourPrice", "nextHourPrice", "dailyPrice"] as const).map((field) => (
                <label key={field} style={styles.field}>
                  <span style={styles.label}>{field}</span>
                  <input style={styles.input} type="number" min="0" step="0.01" value={priceForm[field]}
                    onChange={(e) => setPriceForm((c) => ({ ...c, [field]: e.target.value }))} />
                </label>
              ))}
              <button type="submit" style={styles.button}>Zapisz cennik</button>
            </form>

            {/* Owner assignment */}
            <form style={{ ...styles.formGrid, marginTop: "16px" }} onSubmit={(e) => void submitOwner(e)}>
              <h3 style={{ margin: 0 }}>Właściciel parkingu</h3>
              <div style={styles.helper}>
                Podaj ID użytkownika z rolą PARKING_OWNER. Pozostaw puste, aby usunąć właściciela.
              </div>
              <label style={styles.field}>
                <span style={styles.label}>ID właściciela</span>
                <input style={styles.input} type="number" min="1" value={ownerIdInput} onChange={(e) => setOwnerIdInput(e.target.value)} placeholder="np. 3" />
              </label>
              <button type="submit" style={styles.button}>Przypisz właściciela</button>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
