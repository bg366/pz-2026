import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  getParkingLots, getParkingLot, deleteParkingLot,
  updateOccupancy, updateSpots, updateParkingLotPrice, updateZonePrice, assignParkingLotOwner, getUsers, saveParkingLot
} from "../api/client";
import type { AdminUser, ParkingLot, PriceForm, SpotFormEntry } from "../api/types";
import ParkingLotForm, { type ParkingLotPayload } from "../components/ParkingLotForm";
import { useToast } from "../components/Toast";
import { styles } from "../styles";
import { PL, pl } from "../i18n";

type Props = { token: string };

const spotCategories: SpotFormEntry["category"][] = ["REGULAR", "EV", "DISABLED", "SCT_READY"];
const emptyPrice: PriceForm = { firstHourPrice: "0", secondHourPrice: "0", thirdHourPrice: "0", nextHourPrice: "0", dailyPrice: "0" };

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
    parkingType: parking.parkingType,
    accessType: parking.accessType ?? "BARRIER"
  };
}

function mapPriceToForm(price: ParkingLot["price"]): PriceForm {
  if (!price) return emptyPrice;
  return {
    firstHourPrice: String(price.firstHourPrice),
    secondHourPrice: String(price.secondHourPrice),
    thirdHourPrice: String(price.thirdHourPrice),
    nextHourPrice: String(price.nextHourPrice),
    dailyPrice: String(price.dailyPrice)
  };
}

export default function ParkingLotsView({ token }: Props) {
  const { showToast } = useToast();
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selected, setSelected] = useState<ParkingLot | null>(null);
  const [editing, setEditing] = useState<ParkingLot | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [occupancyValue, setOccupancyValue] = useState("0");
  const [spotForms, setSpotForms] = useState<SpotFormEntry[]>(formatSpotForms([]));
  const [priceForm, setPriceForm] = useState<PriceForm>(emptyPrice);
  const [ownerIdInput, setOwnerIdInput] = useState("");
  const [ownerUsers, setOwnerUsers] = useState<AdminUser[]>([]);
  const [parkingFilter, setParkingFilter] = useState("");
  const [parkingSort, setParkingSort] = useState<"ID_ASC" | "ID_DESC" | "NAME_ASC" | "STATUS_ASC">("ID_ASC");

  const detailsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  async function loadAll() {
    setLoading(true);
    try {
      setParkingLots(await getParkingLots(token));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd ładowania parkingów.", "error");
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
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd ładowania szczegółów.", "error");
    }
  }

  useEffect(() => {
    void loadAll();
    getUsers(token)
      .then((users) => setOwnerUsers(users.filter((u) => u.roles.includes("PARKING_OWNER"))))
      .catch(() => { /* non-critical */ });
  }, []);

  function openForm(parking: ParkingLot | null) {
    setEditing(parking);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Usunąć wybrany parking?")) return;
    try {
      await deleteParkingLot(id, token);
      showToast("Parking został usunięty.");
      if (selected?.id === id) setSelected(null);
      setShowForm(false);
      setEditing(null);
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd usuwania parkingu.", "error");
    }
  }

  async function handleParkingSaved(savedParking: ParkingLot) {
    setShowForm(false);
    setEditing(null);
    await loadAll();
    await loadDetails(savedParking.id);
  }

  async function submitOccupancy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    try {
      const updated = await updateOccupancy(selected.id, Number(occupancyValue), token);
      showToast("Obłożenie zaktualizowane.");
      setSelected(updated);
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd aktualizacji obłożenia.", "error");
    }
  }

  async function submitSpots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    try {
      const updated = await updateSpots(
        selected.id,
        spotForms.map((s) => ({ category: s.category, total: Number(s.total), occupied: Number(s.occupied) })),
        token
      );
      showToast("Kategorie miejsc zapisane.");
      setSelected(updated);
      setSpotForms(formatSpotForms(updated.spots));
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd zapisu kategorii.", "error");
    }
  }

  async function submitPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const isPrivate = selected.parkingType === "PRIVATE" || selected.price?.parkingLotId != null;
    try {
      if (isPrivate) {
        await updateParkingLotPrice(selected.id, priceForm, token);
        showToast("Cennik parkingu zapisany.");
      } else {
        await updateZonePrice(selected.zone, priceForm, token);
        showToast(`Cennik ${pl(PL.zone, selected.zone)} zapisany.`);
      }
      await loadDetails(selected.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd zapisu cennika.", "error");
    }
  }

  async function submitOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    try {
      const ownerId = ownerIdInput.trim() ? Number(ownerIdInput) : null;
      const updated = await assignParkingLotOwner(selected.id, ownerId, token);
      showToast(ownerId ? `Przypisano właściciela (ID: ${ownerId}).` : "Usunięto właściciela.");
      setSelected(updated);
      setOwnerIdInput(updated.ownerId != null ? String(updated.ownerId) : "");
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd przypisania właściciela.", "error");
    }
  }

  async function approveParking(parking: ParkingLot) {
    try {
      const updated = await saveParkingLot({ ...mapParkingToPayload(parking), status: "ACTIVE" }, token);
      showToast("Parking zatwierdzony.");
      if (selected?.id === updated.id) setSelected(updated);
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd zatwierdzania parkingu.", "error");
    }
  }

  const visibleParkingLots = parkingLots
    .filter((parking) => {
      const needle = parkingFilter.trim().toLowerCase();
      if (!needle) return true;
      return [
        String(parking.id),
        parking.name,
        parking.address,
        parking.status,
        parking.zone,
        parking.parkingType,
        parking.ownerEmail ?? ""
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
    <div style={styles.stack}>
      {/* ── Lista parkingów ── */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Parkingi</h2>
            <p style={styles.helper}>Wybierz parking, aby zobaczyć szczegóły lub edytować dane.</p>
          </div>
          <div style={styles.actions}>
            <button type="button" style={styles.button} onClick={() => openForm(null)}>Dodaj parking</button>
            <button type="button" style={styles.subtleButton} onClick={() => void loadAll()}>Odśwież</button>
          </div>
        </div>

        {loading ? (
          <p style={styles.helper}>Ładowanie...</p>
        ) : (
          <>
          <div className="admin-form-row" style={{ ...styles.formRow, marginBottom: "16px" }}>
            <label style={styles.field}>
              <span style={styles.label}>Filtr</span>
              <input
                style={styles.input}
                value={parkingFilter}
                onChange={(e) => setParkingFilter(e.target.value)}
                placeholder="Szukaj po ID, nazwie, adresie, statusie albo właścicielu"
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Sortowanie</span>
              <select style={styles.input} value={parkingSort} onChange={(e) => setParkingSort(e.target.value as typeof parkingSort)}>
                <option value="ID_ASC">ID rosnąco</option>
                <option value="ID_DESC">ID malejąco</option>
                <option value="NAME_ASC">Nazwa A-Z</option>
                <option value="STATUS_ASC">Status</option>
              </select>
            </label>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Parking</th>
                  <th style={styles.th}>Strefa / Typ</th>
                  <th style={styles.th}>Obłożenie</th>
                  <th style={styles.th}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {visibleParkingLots.map((p) => (
                  <tr key={p.id}>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, fontSize: "11px" }}>#{p.id}</span>
                    </td>
                    <td style={styles.td}>
                      <strong>{p.name}</strong>
                      <div style={styles.helper}>{p.address}</div>
                      <div style={styles.helper}>{pl(PL.parkingStatus, p.status)} — {p.openingHours}</div>
                      {p.ownerEmail ? <div style={styles.helper}>Właściciel: {p.ownerEmail}</div> : null}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge}>{pl(PL.zone, p.zone)}</span>
                      <div style={styles.helper}>{pl(PL.parkingType, p.parkingType)}</div>
                    </td>
                    <td style={styles.td}>
                      {p.occupiedSpots} / {p.totalSpots}
                      <div style={styles.helper}>SCT: {p.occupiedSctSpots} / {p.totalSctSpots}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button type="button" style={styles.subtleButton} onClick={() => void loadDetails(p.id)}>Szczegóły</button>
                        {p.status === "PENDING_APPROVAL" ? (
                          <button type="button" style={styles.button} onClick={() => void approveParking(p)}>Zatwierdź</button>
                        ) : null}
                        <button type="button" style={styles.subtleButton} onClick={() => openForm(p)}>Edytuj</button>
                        <button type="button" style={styles.dangerButton} onClick={() => void handleDelete(p.id)}>Usuń</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleParkingLots.length === 0 ? (
                  <tr><td style={styles.td} colSpan={5}>Brak parkingów.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      {/* ── Formularz dodaj/edytuj ── */}
      {showForm ? (
        <section style={styles.card} ref={formRef}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {editing ? `Edytuj: ${editing.name}` : "Dodaj parking"}
              </h2>
              {editing ? <p style={styles.helper}>ID: #{editing.id}</p> : null}
            </div>
            <button type="button" style={styles.subtleButton} onClick={() => { setShowForm(false); setEditing(null); }}>
              Anuluj
            </button>
          </div>
          <ParkingLotForm
            initialData={editing ? mapParkingToPayload(editing) : null}
            authToken={token}
            onSaved={(savedParking) => void handleParkingSaved(savedParking)}
          />
        </section>
      ) : null}

      {/* ── Szczegóły parkingu ── */}
      {selected ? (
        <section style={styles.card} ref={detailsRef}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>{selected.name}</h2>
              <p style={styles.helper}>
                ID: #{selected.id} &bull; {pl(PL.parkingStatus, selected.status)} &bull; {selected.address}
              </p>
            </div>
            <div style={styles.actions}>
              <span style={styles.badge}>{pl(PL.zone, selected.zone)}</span>
              <button type="button" style={styles.subtleButton} onClick={() => setSelected(null)}>Zamknij</button>
            </div>
          </div>

          {/* Podsumowanie */}
          <div className="admin-summary-grid" style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <strong>Wolne miejsca</strong>
              <div style={styles.helper}>{selected.totalSpots - selected.occupiedSpots} / {selected.totalSpots}</div>
            </div>
            <div style={styles.summaryCard}>
              <strong>Miejsca SCT</strong>
              <div style={styles.helper}>{selected.occupiedSctSpots} zajęte / {selected.totalSctSpots} łącznie</div>
            </div>
            <div style={styles.summaryCard}>
              <strong>Godziny działania</strong>
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
              <strong>Typ</strong>
              <div style={styles.helper}>{pl(PL.parkingType, selected.parkingType)}</div>
            </div>
          </div>

          {/* Obłożenie */}
          <form style={{ ...styles.formGrid, marginTop: "24px" }} onSubmit={(e) => void submitOccupancy(e)}>
            <h3 style={{ margin: 0 }}>Obłożenie ogólne</h3>
            <div className="admin-form-row" style={styles.formRow}>
              <label style={styles.field}>
                <span style={styles.label}>Zajęte miejsca</span>
                <input style={styles.input} type="number" min="0" max={selected.totalSpots}
                  value={occupancyValue} onChange={(e) => setOccupancyValue(e.target.value)} />
              </label>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="submit" style={styles.button}>Zapisz obłożenie</button>
              </div>
            </div>
          </form>

          {/* Kategorie miejsc */}
          <form style={{ ...styles.formGrid, marginTop: "24px" }} onSubmit={(e) => void submitSpots(e)}>
            <h3 style={{ margin: 0 }}>Kategorie miejsc</h3>
            {spotForms.map((spot, idx) => (
              <div className="admin-form-row" style={styles.formRow} key={spot.category}>
                <label style={styles.field}>
                  <span style={styles.label}>{pl(PL.spotCategory, spot.category)} — razem</span>
                  <input style={styles.input} type="number" min="0" value={spot.total}
                    onChange={(e) => setSpotForms((cur) => cur.map((s, i) => i === idx ? { ...s, total: e.target.value } : s))} />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>{pl(PL.spotCategory, spot.category)} — zajęte</span>
                  <input style={styles.input} type="number" min="0" value={spot.occupied}
                    onChange={(e) => setSpotForms((cur) => cur.map((s, i) => i === idx ? { ...s, occupied: e.target.value } : s))} />
                </label>
              </div>
            ))}
            <div><button type="submit" style={styles.button}>Zapisz kategorie</button></div>
          </form>

          {/* Cennik */}
          <form style={{ ...styles.formGrid, marginTop: "24px" }} onSubmit={(e) => void submitPrice(e)}>
            <h3 style={{ margin: 0 }}>Cennik</h3>
            <div style={styles.summaryCard}>
              <strong>Zakres</strong>
              <div style={styles.helper}>
                {selected.parkingType === "PRIVATE" || selected.price?.parkingLotId
                  ? "Indywidualny cennik parkingu"
                  : `Cennik ${pl(PL.zone, selected.zone)}`}
              </div>
            </div>
            {(["firstHourPrice", "secondHourPrice", "thirdHourPrice", "nextHourPrice", "dailyPrice"] as const).map((field) => (
              <label key={field} style={styles.field}>
                <span style={styles.label}>{PL.priceField[field]}</span>
                <input style={styles.input} type="number" min="0" step="0.01" value={priceForm[field]}
                  onChange={(e) => setPriceForm((c) => ({ ...c, [field]: e.target.value }))} />
              </label>
            ))}
            <div><button type="submit" style={styles.button}>Zapisz cennik</button></div>
          </form>

          {/* Właściciel */}
          <form style={{ ...styles.formGrid, marginTop: "24px" }} onSubmit={(e) => void submitOwner(e)}>
            <h3 style={{ margin: 0 }}>Właściciel parkingu</h3>
            <div className="admin-form-row" style={styles.formRow}>
              <label style={styles.field}>
                <span style={styles.label}>Właściciel</span>
                <select style={styles.input} value={ownerIdInput} onChange={(e) => setOwnerIdInput(e.target.value)}>
                  <option value="">— brak właściciela —</option>
                  {ownerUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="submit" style={styles.button}>Przypisz właściciela</button>
              </div>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
