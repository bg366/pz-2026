import { useState } from "react";
import type { FormEvent } from "react";
import { loginAdmin, AUTH_STORAGE_KEY } from "./api/client";
import type { AuthState } from "./api/types";
import ParkingLotsView from "./views/ParkingLotsView";
import SctRulesView from "./views/SctRulesView";
import UsersView from "./views/UsersView";
import ReportsView from "./views/ReportsView";
import { styles } from "./styles";

type View = "parking" | "sct" | "users" | "reports";

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: "parking", label: "Parkingi" },
  { id: "sct", label: "Reguły SCT" },
  { id: "users", label: "Użytkownicy" },
  { id: "reports", label: "Raporty" }
];

function readStoredAuth(): AuthState | null {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthState) : null;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());
  const [view, setView] = useState<View>("parking");
  const [loginEmail, setLoginEmail] = useState("admin@krakow-parking.local");
  const [loginPassword, setLoginPassword] = useState("Admin123!");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const payload = await loginAdmin(loginEmail, loginPassword);
      if (payload.role !== "ADMIN") {
        throw new Error("Konto nie ma uprawnień administratora.");
      }
      const authState = payload as AuthState;
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
      setAuth(authState);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Logowanie nie powiodło się.");
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
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
            <form style={styles.formGrid} onSubmit={(e) => void submitLogin(e)}>
              <label style={styles.field}>
                <span style={styles.label}>E-mail</span>
                <input style={styles.input} type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Hasło</span>
                <input style={styles.input} type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
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
            Panel administracyjny: parkingi, obłożenie, cenniki, reguły SCT, użytkownicy i raporty.
          </p>
          <div style={{ ...styles.actions, marginTop: "16px" }}>
            <span style={styles.badge}>{auth.email}</span>
            <button type="button" style={styles.subtleButton} onClick={logout}>Wyloguj</button>
          </div>
        </header>

        <nav style={styles.nav} aria-label="Nawigacja panelu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              style={view === item.id ? styles.button : styles.subtleButton}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {view === "parking" ? <ParkingLotsView token={auth.token} /> : null}
        {view === "sct" ? <SctRulesView token={auth.token} /> : null}
        {view === "users" ? <UsersView token={auth.token} /> : null}
        {view === "reports" ? <ReportsView token={auth.token} /> : null}
      </div>
    </main>
  );
}
