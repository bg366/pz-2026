import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import ParkingLotForm, { type ParkingLotPayload } from "./components/ParkingLotForm";

type ParkingSpot = {
  id: number;
  category: "REGULAR" | "EV" | "DISABLED" | "SCT_READY";
  total: number;
  occupied: number;
};

type AuthState = {
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "USER";
  token: string;
};

type UserRole = "ADMIN" | "USER";
type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";

type AdminVehicle = {
  id: number;
  brand: string;
  model: string;
  registrationNumber: string;
  fuelType: string;
  emissionStandard: string;
  productionYear: number;
  vehicleType: string;
  sctCompliant: boolean;
  active: boolean;
};

type AdminUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  vehicleCount: number;
  activeVehicleRegistration: string | null;
};

type AdminUserDetails = Omit<AdminUser, "vehicleCount" | "activeVehicleRegistration"> & {
  vehicles: AdminVehicle[];
};

type PasswordResetResponse = {
  userId: number;
  temporaryPassword: string;
};

type Price = {
  id: number;
  zone: "ZONE_A" | "ZONE_B" | "ZONE_C" | null;
  parkingLotId: number | null;
  firstHourPrice: number;
  secondHourPrice: number;
  thirdHourPrice: number;
  nextHourPrice: number;
  dailyPrice: number;
  currency: string;
};

type ParkingLot = {
  id: number;
  name: string;
  address: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "TEMPORARILY_CLOSED";
  zone: "ZONE_A" | "ZONE_B" | "ZONE_C";
  latitude: number;
  longitude: number;
  totalSpots: number;
  occupiedSpots: number;
  totalSctSpots: number;
  occupiedSctSpots: number;
  openingHours: string;
  parkingType: string;
  spots: ParkingSpot[];
  price: Price | null;
};

type SctRule = {
  id: number;
  zone: "ZONE_A" | "ZONE_B" | "ZONE_C";
  fuelType: "PETROL" | "DIESEL" | "LPG" | "HYBRID" | "ELECTRIC";
  minEmissionStandard: string;
  allowed: boolean;
  validFrom: string;
  validTo: string | null;
  description: string | null;
};

type PagedResponse = {
  content?: ParkingLot[];
};

type SctRuleForm = {
  id?: number;
  zone: "ZONE_A" | "ZONE_B" | "ZONE_C";
  fuelType: "PETROL" | "DIESEL" | "LPG" | "HYBRID" | "ELECTRIC";
  minEmissionStandard: string;
  allowed: boolean;
  validFrom: string;
  validTo: string;
  description: string;
};

type PriceForm = {
  firstHourPrice: string;
  secondHourPrice: string;
  thirdHourPrice: string;
  nextHourPrice: string;
  dailyPrice: string;
};

type SpotFormEntry = {
  category: ParkingSpot["category"];
  total: string;
  occupied: string;
};

const emptyPriceForm: PriceForm = {
  firstHourPrice: "0",
  secondHourPrice: "0",
  thirdHourPrice: "0",
  nextHourPrice: "0",
  dailyPrice: "0"
};

const emptyRuleForm: SctRuleForm = {
  zone: "ZONE_A",
  fuelType: "DIESEL",
  minEmissionStandard: "EURO_5",
  allowed: true,
  validFrom: "2024-07-01",
  validTo: "",
  description: ""
};

const spotCategories: SpotFormEntry["category"][] = ["REGULAR", "EV", "DISABLED", "SCT_READY"];
const authStorageKey = "krakow-parking-admin-auth";

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 20px",
    background:
      "radial-gradient(circle at top, rgba(248, 220, 183, 0.35), transparent 35%), linear-gradient(180deg, #fff8ef 0%, #fffefc 100%)",
    color: "#1f2937",
    fontFamily: '"Segoe UI", sans-serif'
  },
  container: {
    maxWidth: "1320px",
    margin: "0 auto"
  },
  header: {
    marginBottom: "24px"
  },
  title: {
    margin: "0 0 8px",
    fontSize: "36px",
    fontWeight: 800
  },
  lead: {
    margin: 0,
    maxWidth: "760px",
    color: "#5b6475",
    lineHeight: 1.6
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: "24px",
    alignItems: "start"
  },
  stack: {
    display: "grid",
    gap: "24px"
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid rgba(162, 123, 92, 0.18)",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 18px 40px rgba(98, 68, 40, 0.08)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px"
  },
  sectionTitle: {
    margin: 0,
    fontSize: "22px"
  },
  helper: {
    margin: "8px 0 0",
    color: "#6b7280",
    lineHeight: 1.5
  },
  button: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 16px",
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#9a3412",
    cursor: "pointer"
  },
  subtleButton: {
    border: "1px solid rgba(154, 52, 18, 0.15)",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 700,
    color: "#9a3412",
    backgroundColor: "#fff7ed",
    cursor: "pointer"
  },
  dangerButton: {
    border: "none",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#be123c",
    cursor: "pointer"
  },
  tableWrapper: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const
  },
  th: {
    textAlign: "left" as const,
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#7c5c46",
    padding: "0 0 12px"
  },
  td: {
    padding: "14px 0",
    borderTop: "1px solid rgba(162, 123, 92, 0.14)",
    verticalAlign: "top" as const
  },
  actions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px"
  },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    backgroundColor: "#ffedd5",
    color: "#9a3412",
    fontSize: "12px",
    fontWeight: 700
  },
  feedback: {
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14px"
  },
  error: {
    backgroundColor: "#fff1f2",
    color: "#be123c"
  },
  success: {
    backgroundColor: "#ecfdf5",
    color: "#047857"
  },
  formGrid: {
    display: "grid",
    gap: "12px"
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px"
  },
  field: {
    display: "grid",
    gap: "8px"
  },
  label: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#7c2d12"
  },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    borderRadius: "12px",
    border: "1px solid rgba(124, 45, 18, 0.18)",
    padding: "12px 14px",
    fontSize: "14px",
    backgroundColor: "#fffefc"
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px"
  },
  summaryCard: {
    padding: "16px",
    borderRadius: "16px",
    backgroundColor: "#fff7ed",
    border: "1px solid rgba(154, 52, 18, 0.12)"
  }
} satisfies Record<string, CSSProperties>;

function normalizeParkingLots(payload: ParkingLot[] | PagedResponse): ParkingLot[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload.content) ? payload.content : [];
}

function formatSpotForms(spots: ParkingSpot[]): SpotFormEntry[] {
  return spotCategories.map((category) => {
    const match = spots.find((spot) => spot.category === category);
    return {
      category,
      total: String(match?.total ?? 0),
      occupied: String(match?.occupied ?? 0)
    };
  });
}

function mapParkingToFormValues(parkingLot: ParkingLot): ParkingLotPayload {
  return {
    id: parkingLot.id,
    name: parkingLot.name,
    address: parkingLot.address,
    description: parkingLot.description ?? "",
    status: parkingLot.status,
    zone: parkingLot.zone,
    latitude: String(parkingLot.latitude),
    longitude: String(parkingLot.longitude),
    totalSpots: String(parkingLot.totalSpots),
    occupiedSpots: parkingLot.occupiedSpots,
    totalSctSpots: String(parkingLot.totalSctSpots),
    occupiedSctSpots: parkingLot.occupiedSctSpots,
    openingHours: parkingLot.openingHours,
    parkingType: parkingLot.parkingType
  };
}

function mapPriceToForm(price: Price | null): PriceForm {
  if (!price) {
    return emptyPriceForm;
  }

  return {
    firstHourPrice: String(price.firstHourPrice),
    secondHourPrice: String(price.secondHourPrice),
    thirdHourPrice: String(price.thirdHourPrice),
    nextHourPrice: String(price.nextHourPrice),
    dailyPrice: String(price.dailyPrice)
  };
}

function mapRuleToForm(rule: SctRule): SctRuleForm {
  return {
    id: rule.id,
    zone: rule.zone,
    fuelType: rule.fuelType,
    minEmissionStandard: rule.minEmissionStandard,
    allowed: rule.allowed,
    validFrom: rule.validFrom,
    validTo: rule.validTo ?? "",
    description: rule.description ?? ""
  };
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const stored = window.localStorage.getItem(authStorageKey);
    return stored ? (JSON.parse(stored) as AuthState) : null;
  });
  const [loginEmail, setLoginEmail] = useState("admin@krakow-parking.local");
  const [loginPassword, setLoginPassword] = useState("Admin123!");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [selectedParkingId, setSelectedParkingId] = useState<number | null>(null);
  const [selectedParking, setSelectedParking] = useState<ParkingLot | null>(null);
  const [editingParking, setEditingParking] = useState<ParkingLot | null>(null);
  const [loadingParkingLots, setLoadingParkingLots] = useState(true);
  const [parkingError, setParkingError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [occupancyValue, setOccupancyValue] = useState("0");
  const [spotForms, setSpotForms] = useState<SpotFormEntry[]>(formatSpotForms([]));
  const [priceForm, setPriceForm] = useState<PriceForm>(emptyPriceForm);

  const [sctRules, setSctRules] = useState<SctRule[]>([]);
  const [ruleForm, setRuleForm] = useState<SctRuleForm>(emptyRuleForm);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  const selectedParkingSummary = useMemo(() => {
    if (!selectedParking) {
      return null;
    }

    return {
      available: selectedParking.totalSpots - selectedParking.occupiedSpots,
      priceConfigured: selectedParking.price != null,
      categories: selectedParking.spots.length
    };
  }, [selectedParking]);

  function adminHeaders(extra?: HeadersInit): HeadersInit {
    return {
      ...extra,
      Authorization: `Basic ${auth?.token ?? ""}`
    };
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as AuthState;
      if (payload.role !== "ADMIN") {
        throw new Error("Konto nie ma uprawnień administratora.");
      }

      window.localStorage.setItem(authStorageKey, JSON.stringify(payload));
      setAuth(payload);
    } catch (requestError) {
      setLoginError(requestError instanceof Error ? requestError.message : "Logowanie nie powiodło się.");
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(authStorageKey);
    setAuth(null);
    setParkingLots([]);
    setSelectedParkingId(null);
    setSelectedParking(null);
    setUsers([]);
    setSelectedUser(null);
    setTemporaryPassword(null);
  }

  async function loadParkingLots() {
    setLoadingParkingLots(true);
    setParkingError(null);

    try {
      const response = await fetch("/api/admin/parking-lots?size=50", {
        headers: adminHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as ParkingLot[] | PagedResponse;
      const normalized = normalizeParkingLots(payload);
      setParkingLots(normalized);

      if (selectedParkingId == null && normalized.length > 0) {
        setSelectedParkingId(normalized[0].id);
      }
    } catch (requestError) {
      setParkingError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoadingParkingLots(false);
    }
  }

  async function loadParkingDetails(parkingLotId: number) {
    try {
      const response = await fetch(`/api/admin/parking-lots/${parkingLotId}`, {
        headers: adminHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as ParkingLot;
      setSelectedParking(payload);
      setOccupancyValue(String(payload.occupiedSpots));
      setSpotForms(formatSpotForms(payload.spots));
      setPriceForm(mapPriceToForm(payload.price));
    } catch (requestError) {
      setParkingError(requestError instanceof Error ? requestError.message : "Could not load parking details.");
    }
  }

  async function loadSctRules() {
    try {
      const response = await fetch("/api/admin/sct-rules", {
        headers: adminHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setSctRules((await response.json()) as SctRule[]);
    } catch (requestError) {
      setParkingError(requestError instanceof Error ? requestError.message : "Could not load SCT rules.");
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch("/api/admin/users", {
        headers: adminHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as AdminUser[];
      setUsers(payload);
      if (!selectedUser && payload.length > 0) {
        await loadUserDetails(payload[0].id);
      }
    } catch (requestError) {
      setParkingError(requestError instanceof Error ? requestError.message : "Could not load users.");
    }
  }

  async function loadUserDetails(userId: number) {
    const response = await fetch(`/api/admin/users/${userId}`, {
      headers: adminHeaders()
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setSelectedUser((await response.json()) as AdminUserDetails);
    setTemporaryPassword(null);
  }

  useEffect(() => {
    if (auth) {
      void loadParkingLots();
      void loadSctRules();
      void loadUsers();
    }
  }, [auth]);

  useEffect(() => {
    if (selectedParkingId != null) {
      void loadParkingDetails(selectedParkingId);
    }
  }, [selectedParkingId]);

  async function handleParkingSaved(savedParking: ParkingLot) {
    setStatusMessage(`Zapisano parking: ${savedParking.name}.`);
    setEditingParking(null);
    setSelectedParkingId(savedParking.id);
    await loadParkingLots();
    await loadParkingDetails(savedParking.id);
  }

  async function handleParkingDelete(parkingLotId: number) {
    if (!window.confirm("Usunąć wybrany parking?")) {
      return;
    }

    const response = await fetch(`/api/admin/parking-lots/${parkingLotId}`, {
      method: "DELETE",
      headers: adminHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatusMessage("Parking został usunięty.");
    setEditingParking(null);
    setSelectedParkingId(null);
    setSelectedParking(null);
    await loadParkingLots();
  }

  async function submitOccupancy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedParking) {
      return;
    }

    const response = await fetch(`/api/admin/parking-lots/${selectedParking.id}/occupancy`, {
      method: "PATCH",
      headers: adminHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ occupiedSpots: Number(occupancyValue) })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatusMessage("Zaktualizowano obłożenie.");
    await loadParkingLots();
    await loadParkingDetails(selectedParking.id);
  }

  async function submitSpots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedParking) {
      return;
    }

    const payload = spotForms.map((spot) => ({
      category: spot.category,
      total: Number(spot.total),
      occupied: Number(spot.occupied)
    }));

    const response = await fetch(`/api/admin/parking-lots/${selectedParking.id}/spots`, {
      method: "PUT",
      headers: adminHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    setStatusMessage("Zapisano konfigurację kategorii miejsc.");
    await loadParkingLots();
    await loadParkingDetails(selectedParking.id);
  }

  async function submitPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedParking) {
      return;
    }

    const isParkingSpecificPrice = selectedParking.parkingType === "PRIVATE" || selectedParking.price?.parkingLotId != null;
    const path = isParkingSpecificPrice
      ? `/api/admin/parking-lots/${selectedParking.id}/price`
      : `/api/admin/prices/zones/${selectedParking.zone}`;

    const response = await fetch(path, {
      method: "PUT",
      headers: adminHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        firstHourPrice: Number(priceForm.firstHourPrice),
        secondHourPrice: Number(priceForm.secondHourPrice),
        thirdHourPrice: Number(priceForm.thirdHourPrice),
        nextHourPrice: Number(priceForm.nextHourPrice),
        dailyPrice: Number(priceForm.dailyPrice)
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    setStatusMessage(isParkingSpecificPrice ? "Zapisano cennik parkingu." : "Zapisano cennik strefy.");
    await loadParkingLots();
    await loadParkingDetails(selectedParking.id);
  }

  async function submitRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const method = ruleForm.id ? "PUT" : "POST";
    const path = ruleForm.id ? `/api/admin/sct-rules/${ruleForm.id}` : "/api/admin/sct-rules";

    const response = await fetch(path, {
      method,
      headers: adminHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        zone: ruleForm.zone,
        fuelType: ruleForm.fuelType,
        minEmissionStandard: ruleForm.minEmissionStandard,
        allowed: ruleForm.allowed,
        validFrom: ruleForm.validFrom,
        validTo: ruleForm.validTo || null,
        description: ruleForm.description || null
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    setStatusMessage("Zapisano regułę SCT.");
    setRuleForm(emptyRuleForm);
    await loadSctRules();
  }

  async function deleteRule(ruleId: number) {
    const response = await fetch(`/api/admin/sct-rules/${ruleId}`, {
      method: "DELETE",
      headers: adminHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setStatusMessage("Usunięto regułę SCT.");
    setRuleForm(emptyRuleForm);
    await loadSctRules();
  }

  async function updateUserRole(userId: number, role: UserRole) {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: adminHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ role })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    setStatusMessage("Zmieniono role uzytkownika.");
    await loadUsers();
    await loadUserDetails(userId);
  }

  async function updateUserStatus(userId: number, status: UserStatus) {
    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: adminHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    setStatusMessage("Zmieniono status uzytkownika.");
    await loadUsers();
    await loadUserDetails(userId);
  }

  async function resetUserPassword(userId: number) {
    const response = await fetch(`/api/admin/users/${userId}/password-reset`, {
      method: "POST",
      headers: adminHeaders()
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = (await response.json()) as PasswordResetResponse;
    setTemporaryPassword(payload.temporaryPassword);
    setStatusMessage("Wygenerowano haslo tymczasowe.");
  }

  async function withStatus(action: () => Promise<void>) {
    try {
      setParkingError(null);
      await action();
    } catch (requestError) {
      setParkingError(requestError instanceof Error ? requestError.message : "Operation failed.");
    }
  }

  if (!auth) {
    return (
      <main style={styles.page}>
        <div style={{ ...styles.container, maxWidth: "520px" }}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h1 style={styles.title}>Logowanie administratora</h1>
                <p style={styles.helper}>Dostęp do panelu wymaga konta z rolą ADMIN.</p>
              </div>
            </div>

            <form style={styles.formGrid} onSubmit={submitLogin}>
              <label style={styles.field}>
                <span style={styles.label}>E-mail</span>
                <input
                  style={styles.input}
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Hasło</span>
                <input
                  style={styles.input}
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  required
                />
              </label>

              {loginError ? <div style={{ ...styles.feedback, ...styles.error }}>{loginError}</div> : null}

              <button type="submit" style={styles.button} disabled={loginLoading}>
                {loginLoading ? "Logowanie..." : "Zaloguj"}
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Parking Admin Kraków</h1>
          <p style={styles.lead}>
            Panel domyka operacyjne MVP: parkingi, obłożenie, taryfy, konfigurację kategorii miejsc
            oraz reguły SCT.
          </p>
          <div style={{ ...styles.actions, marginTop: "16px" }}>
            <span style={styles.badge}>{auth.email}</span>
            <button type="button" style={styles.subtleButton} onClick={logout}>
              Wyloguj
            </button>
          </div>
        </header>

        {statusMessage ? <div style={{ ...styles.feedback, ...styles.success }}>{statusMessage}</div> : null}
        {parkingError ? <div style={{ ...styles.feedback, ...styles.error }}>{parkingError}</div> : null}

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Parkingi</h2>
                <p style={styles.helper}>Lista, wybór aktywnego parkingu i podstawowe akcje administracyjne.</p>
              </div>

              <button type="button" style={styles.button} onClick={() => void loadParkingLots()}>
                Odśwież
              </button>
            </div>

            {loadingParkingLots ? (
              <p style={styles.helper}>Ładowanie parkingów...</p>
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
                    {parkingLots.map((parkingLot) => (
                      <tr key={parkingLot.id}>
                        <td style={styles.td}>
                          <strong>{parkingLot.name}</strong>
                          <div style={styles.helper}>{parkingLot.address}</div>
                          <div style={styles.helper}>{parkingLot.status} - {parkingLot.openingHours}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badge}>{parkingLot.zone}</span>
                        </td>
                        <td style={styles.td}>
                          {parkingLot.occupiedSpots} / {parkingLot.totalSpots}
                          <div style={styles.helper}>
                            SCT: {parkingLot.occupiedSctSpots} / {parkingLot.totalSctSpots}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button
                              type="button"
                              style={styles.subtleButton}
                              onClick={() => setSelectedParkingId(parkingLot.id)}
                            >
                              Szczegóły
                            </button>
                            <button
                              type="button"
                              style={styles.subtleButton}
                              onClick={() => setEditingParking(parkingLot)}
                            >
                              Edytuj
                            </button>
                            <button
                              type="button"
                              style={styles.dangerButton}
                              onClick={() => void withStatus(() => handleParkingDelete(parkingLot.id))}
                            >
                              Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div style={styles.stack}>
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>{editingParking ? "Edytuj parking" : "Dodaj parking"}</h2>
                  <p style={styles.helper}>
                    Formularz tworzenia i edycji podstawowych danych parkingu.
                  </p>
                </div>
                {editingParking ? (
                  <button type="button" style={styles.subtleButton} onClick={() => setEditingParking(null)}>
                    Anuluj edycję
                  </button>
                ) : null}
              </div>

              <ParkingLotForm
                initialData={editingParking ? mapParkingToFormValues(editingParking) : null}
                authToken={auth.token}
                onSaved={(savedParking) => withStatus(() => handleParkingSaved(savedParking))}
              />
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Reguły SCT</h2>
                  <p style={styles.helper}>
                    Aktualne reguły wjazdu do stref, edytowalne z poziomu MVP.
                  </p>
                </div>
              </div>

              <form style={styles.formGrid} onSubmit={(event) => void withStatus(() => submitRule(event))}>
                <div style={styles.formRow}>
                  <label style={styles.field}>
                    <span style={styles.label}>Strefa</span>
                    <select
                      style={styles.input}
                      value={ruleForm.zone}
                      onChange={(event) =>
                        setRuleForm((current) => ({
                          ...current,
                          zone: event.target.value as SctRuleForm["zone"]
                        }))
                      }
                    >
                      <option value="ZONE_A">ZONE_A</option>
                      <option value="ZONE_B">ZONE_B</option>
                      <option value="ZONE_C">ZONE_C</option>
                    </select>
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Paliwo</span>
                    <select
                      style={styles.input}
                      value={ruleForm.fuelType}
                      onChange={(event) =>
                        setRuleForm((current) => ({
                          ...current,
                          fuelType: event.target.value as SctRuleForm["fuelType"]
                        }))
                      }
                    >
                      <option value="PETROL">PETROL</option>
                      <option value="DIESEL">DIESEL</option>
                      <option value="LPG">LPG</option>
                      <option value="HYBRID">HYBRID</option>
                      <option value="ELECTRIC">ELECTRIC</option>
                    </select>
                  </label>
                </div>

                <div style={styles.formRow}>
                  <label style={styles.field}>
                    <span style={styles.label}>Min. norma</span>
                    <select
                      style={styles.input}
                      value={ruleForm.minEmissionStandard}
                      onChange={(event) =>
                        setRuleForm((current) => ({ ...current, minEmissionStandard: event.target.value }))
                      }
                    >
                      <option value="EURO_1">EURO_1</option>
                      <option value="EURO_2">EURO_2</option>
                      <option value="EURO_3">EURO_3</option>
                      <option value="EURO_4">EURO_4</option>
                      <option value="EURO_5">EURO_5</option>
                      <option value="EURO_6">EURO_6</option>
                      <option value="ELECTRIC">ELECTRIC</option>
                    </select>
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Dozwolony</span>
                    <select
                      style={styles.input}
                      value={String(ruleForm.allowed)}
                      onChange={(event) =>
                        setRuleForm((current) => ({ ...current, allowed: event.target.value === "true" }))
                      }
                    >
                      <option value="true">TAK</option>
                      <option value="false">NIE</option>
                    </select>
                  </label>
                </div>

                <div style={styles.formRow}>
                  <label style={styles.field}>
                    <span style={styles.label}>Valid from</span>
                    <input
                      style={styles.input}
                      type="date"
                      value={ruleForm.validFrom}
                      onChange={(event) => setRuleForm((current) => ({ ...current, validFrom: event.target.value }))}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Valid to</span>
                    <input
                      style={styles.input}
                      type="date"
                      value={ruleForm.validTo}
                      onChange={(event) => setRuleForm((current) => ({ ...current, validTo: event.target.value }))}
                    />
                  </label>
                </div>

                <label style={styles.field}>
                  <span style={styles.label}>Opis</span>
                  <input
                    style={styles.input}
                    value={ruleForm.description}
                    onChange={(event) => setRuleForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Opis uchwały lub wyjątku"
                  />
                </label>

                <div style={styles.actions}>
                  <button type="submit" style={styles.button}>
                    {ruleForm.id ? "Zapisz regułę" : "Dodaj regułę"}
                  </button>
                  {ruleForm.id ? (
                    <button type="button" style={styles.subtleButton} onClick={() => setRuleForm(emptyRuleForm)}>
                      Anuluj edycję
                    </button>
                  ) : null}
                </div>
              </form>

              <div style={{ ...styles.tableWrapper, marginTop: "20px" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Reguła</th>
                      <th style={styles.th}>Zakres</th>
                      <th style={styles.th}>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sctRules.map((rule) => (
                      <tr key={rule.id}>
                        <td style={styles.td}>
                          <strong>{rule.zone}</strong>
                          <div style={styles.helper}>
                            {rule.fuelType} • {rule.minEmissionStandard} • {rule.allowed ? "DOZWOLONY" : "ZABRONIONY"}
                          </div>
                        </td>
                        <td style={styles.td}>
                          {rule.validFrom}
                          {rule.validTo ? ` - ${rule.validTo}` : " - bezterminowo"}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button type="button" style={styles.subtleButton} onClick={() => setRuleForm(mapRuleToForm(rule))}>
                              Edytuj
                            </button>
                            <button
                              type="button"
                              style={styles.dangerButton}
                              onClick={() => void withStatus(() => deleteRule(rule.id))}
                            >
                              Usuń
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>

        <div style={{ ...styles.stack, marginTop: "24px" }}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Uzytkownicy</h2>
                <p style={styles.helper}>
                  Lista kont, role, statusy i pojazdy zapisane przez uzytkownikow.
                </p>
              </div>
              <span style={styles.badge}>{users.length} kont</span>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Uzytkownik</th>
                    <th style={styles.th}>Rola</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Pojazdy</th>
                    <th style={styles.th}>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td style={styles.td}>
                        <strong>{user.firstName} {user.lastName}</strong>
                        <div style={styles.helper}>{user.email}</div>
                      </td>
                      <td style={styles.td}>
                        <select
                          style={styles.input}
                          value={user.role}
                          onChange={(event) =>
                            void withStatus(() => updateUserRole(user.id, event.target.value as UserRole))
                          }
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="USER">USER</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        <select
                          style={styles.input}
                          value={user.status}
                          onChange={(event) =>
                            void withStatus(() => updateUserStatus(user.id, event.target.value as UserStatus))
                          }
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="BLOCKED">BLOCKED</option>
                          <option value="DELETED">DELETED</option>
                        </select>
                      </td>
                      <td style={styles.td}>
                        {user.vehicleCount}
                        {user.activeVehicleRegistration ? (
                          <div style={styles.helper}>Aktywny: {user.activeVehicleRegistration}</div>
                        ) : null}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            type="button"
                            style={styles.subtleButton}
                            onClick={() => void withStatus(() => loadUserDetails(user.id))}
                          >
                            Szczegoly
                          </button>
                          <button
                            type="button"
                            style={styles.dangerButton}
                            onClick={() => void withStatus(() => resetUserPassword(user.id))}
                          >
                            Reset hasla
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {temporaryPassword ? (
              <div style={{ ...styles.feedback, ...styles.success, marginTop: "16px" }}>
                Haslo tymczasowe: <strong>{temporaryPassword}</strong>
              </div>
            ) : null}

            {selectedUser ? (
              <div style={{ ...styles.summaryCard, marginTop: "20px" }}>
                <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                <div style={styles.helper}>
                  {selectedUser.email} - {selectedUser.role} - {selectedUser.status}
                </div>
                <div style={{ ...styles.tableWrapper, marginTop: "12px" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Pojazd</th>
                        <th style={styles.th}>Rejestracja</th>
                        <th style={styles.th}>SCT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.vehicles.map((vehicle) => (
                        <tr key={vehicle.id}>
                          <td style={styles.td}>
                            <strong>{vehicle.brand} {vehicle.model}</strong>
                            <div style={styles.helper}>{vehicle.fuelType} - {vehicle.emissionStandard}</div>
                          </td>
                          <td style={styles.td}>
                            {vehicle.registrationNumber}
                            {vehicle.active ? <div style={styles.helper}>aktywny</div> : null}
                          </td>
                          <td style={styles.td}>{vehicle.sctCompliant ? "Spelnia" : "Nie spelnia"}</td>
                        </tr>
                      ))}
                      {selectedUser.vehicles.length === 0 ? (
                        <tr>
                          <td style={styles.td} colSpan={3}>Brak zapisanych pojazdow.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div style={{ ...styles.stack, marginTop: "24px" }}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Wybrany parking</h2>
                  <p style={styles.helper}>
                  Konfiguracja obłożenia, kategorii miejsc i cennika dla aktywnego parkingu.
                </p>
              </div>
              {selectedParking ? <span style={styles.badge}>{selectedParking.name}</span> : null}
            </div>

            {!selectedParking ? (
              <p style={styles.helper}>Wybierz parking z listy, aby zobaczyć szczegóły.</p>
            ) : (
              <div style={styles.stack}>
                {selectedParkingSummary ? (
                  <div style={styles.summaryGrid}>
                    <div style={styles.summaryCard}>
                      <strong>Dostępne miejsca</strong>
                      <div style={styles.helper}>{selectedParkingSummary.available}</div>
                    </div>
                    <div style={styles.summaryCard}>
                      <strong>Status</strong>
                      <div style={styles.helper}>{selectedParking.status}</div>
                    </div>
                    <div style={styles.summaryCard}>
                      <strong>Godziny</strong>
                      <div style={styles.helper}>{selectedParking.openingHours}</div>
                    </div>
                    <div style={styles.summaryCard}>
                      <strong>Miejsca SCT</strong>
                      <div style={styles.helper}>
                        {selectedParking.occupiedSctSpots} / {selectedParking.totalSctSpots}
                      </div>
                    </div>
                    <div style={styles.summaryCard}>
                      <strong>Cennik</strong>
                      <div style={styles.helper}>
                        {selectedParkingSummary.priceConfigured ? "skonfigurowany" : "brak"}
                      </div>
                    </div>
                    <div style={styles.summaryCard}>
                      <strong>Kategorie miejsc</strong>
                      <div style={styles.helper}>{selectedParkingSummary.categories}</div>
                    </div>
                  </div>
                ) : null}

                <form style={styles.formGrid} onSubmit={(event) => void withStatus(() => submitOccupancy(event))}>
                  <div style={styles.formRow}>
                    <label style={styles.field}>
                      <span style={styles.label}>Obłożenie parkingu</span>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        max={selectedParking.totalSpots}
                        value={occupancyValue}
                        onChange={(event) => setOccupancyValue(event.target.value)}
                      />
                    </label>
                  </div>
                  <button type="submit" style={styles.button}>
                    Zapisz obłożenie
                  </button>
                </form>

                <form style={styles.formGrid} onSubmit={(event) => void withStatus(() => submitSpots(event))}>
                  <h3 style={{ margin: 0 }}>Kategorie miejsc</h3>
                  {spotForms.map((spot, index) => (
                    <div style={styles.formRow} key={spot.category}>
                      <label style={styles.field}>
                        <span style={styles.label}>{spot.category} total</span>
                        <input
                          style={styles.input}
                          type="number"
                          min="0"
                          value={spot.total}
                          onChange={(event) =>
                            setSpotForms((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, total: event.target.value } : entry
                              )
                            )
                          }
                        />
                      </label>
                      <label style={styles.field}>
                        <span style={styles.label}>{spot.category} occupied</span>
                        <input
                          style={styles.input}
                          type="number"
                          min="0"
                          value={spot.occupied}
                          onChange={(event) =>
                            setSpotForms((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, occupied: event.target.value } : entry
                              )
                            )
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button type="submit" style={styles.button}>
                    Zapisz kategorie miejsc
                  </button>
                </form>

                <form style={styles.formGrid} onSubmit={(event) => void withStatus(() => submitPrice(event))}>
                  <h3 style={{ margin: 0 }}>Cennik</h3>
                  {selectedParking.price ? (
                    <div style={styles.summaryCard}>
                      <strong>Zakres</strong>
                      <div style={styles.helper}>
                        {selectedParking.parkingType === "PRIVATE" || selectedParking.price.parkingLotId
                          ? "indywidualny cennik parkingu"
                          : `miejski cennik strefy ${selectedParking.zone}`}
                      </div>
                    </div>
                  ) : (
                    <div style={styles.summaryCard}>
                      <strong>Zakres</strong>
                      <div style={styles.helper}>
                        {selectedParking.parkingType === "PRIVATE"
                          ? "nowy indywidualny cennik parkingu"
                          : `nowy miejski cennik strefy ${selectedParking.zone}`}
                      </div>
                    </div>
                  )}

                  <div style={styles.formRow}>
                    <label style={styles.field}>
                      <span style={styles.label}>1. godzina</span>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceForm.firstHourPrice}
                        onChange={(event) =>
                          setPriceForm((current) => ({ ...current, firstHourPrice: event.target.value }))
                        }
                      />
                    </label>
                    <label style={styles.field}>
                      <span style={styles.label}>2. godzina</span>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceForm.secondHourPrice}
                        onChange={(event) =>
                          setPriceForm((current) => ({ ...current, secondHourPrice: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div style={styles.formRow}>
                    <label style={styles.field}>
                      <span style={styles.label}>3. godzina</span>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceForm.thirdHourPrice}
                        onChange={(event) =>
                          setPriceForm((current) => ({ ...current, thirdHourPrice: event.target.value }))
                        }
                      />
                    </label>
                    <label style={styles.field}>
                      <span style={styles.label}>Każda kolejna</span>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceForm.nextHourPrice}
                        onChange={(event) =>
                          setPriceForm((current) => ({ ...current, nextHourPrice: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div style={styles.formRow}>
                    <label style={styles.field}>
                      <span style={styles.label}>Doba</span>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceForm.dailyPrice}
                        onChange={(event) =>
                          setPriceForm((current) => ({ ...current, dailyPrice: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <button type="submit" style={styles.button}>
                    Zapisz cennik
                  </button>

                  {selectedParking.price ? (
                    <div style={styles.summaryGrid}>
                      <div style={styles.summaryCard}>
                        <strong>Aktualnie 1 / 2 / 3 godz.</strong>
                        <div style={styles.helper}>
                          {selectedParking.price.firstHourPrice} / {selectedParking.price.secondHourPrice} / {selectedParking.price.thirdHourPrice} {selectedParking.price.currency}
                        </div>
                      </div>
                      <div style={styles.summaryCard}>
                        <strong>Kolejna / doba</strong>
                        <div style={styles.helper}>
                          {selectedParking.price.nextHourPrice} / {selectedParking.price.dailyPrice} {selectedParking.price.currency}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
