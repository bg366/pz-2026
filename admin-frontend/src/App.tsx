import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { loginAdmin, changePassword, AUTH_STORAGE_KEY } from "./api/client";
import type { AuthState } from "./api/types";
import ParkingLotsView from "./views/ParkingLotsView";
import SctRulesView from "./views/SctRulesView";
import UsersView from "./views/UsersView";
import ReportsView from "./views/ReportsView";
import IotView from "./views/IotView";
import { styles } from "./styles";

type View = "parking" | "sct" | "users" | "reports" | "iot";

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: "parking", label: "Parkingi" },
  { id: "sct", label: "Reguły SCT" },
  { id: "users", label: "Użytkownicy" },
  { id: "reports", label: "Raporty" },
  { id: "iot", label: "IoT" }
];

const VIEW_ROUTES: Record<View, string> = {
  parking: "/admin/parkingi",
  sct: "/admin/sct",
  users: "/admin/uzytkownicy",
  reports: "/admin/raporty",
  iot: "/admin/iot"
};

function normalizePath(pathname: string): string {
  if (pathname.startsWith("/admin/") || pathname === "/admin") return pathname;
  return `/admin${pathname === "/" ? "/parkingi" : pathname}`;
}

function viewFromPath(pathname: string): View {
  const normalized = normalizePath(pathname);
  const match = (Object.entries(VIEW_ROUTES) as [View, string][])
    .find(([, route]) => normalized === route || normalized === `${route}/`);
  return match?.[0] ?? "parking";
}

function readStoredAuth(): AuthState | null {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const auth = stored ? (JSON.parse(stored) as AuthState) : null;
    if (auth && auth.token.split(".").length !== 3) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return auth;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [loginEmail, setLoginEmail] = useState("admin@krakow-parking.local");
  const [loginPassword, setLoginPassword] = useState("Admin123!");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function navigate(nextView: View) {
    setView(nextView);
    const nextPath = VIEW_ROUTES[nextView];
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  }

  useEffect(() => {
    if (window.location.pathname === "/admin" || window.location.pathname === "/admin/" || window.location.pathname === "/") {
      window.history.replaceState(null, "", VIEW_ROUTES[view]);
    }
    function handlePopState() {
      setView(viewFromPath(window.location.pathname));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const payload = await loginAdmin(loginEmail, loginPassword);
      if (!Array.isArray(payload.roles) || !payload.roles.includes("ADMIN")) {
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
    window.history.pushState(null, "", "/admin/parkingi");
    setView("parking");
  }

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;
    setPasswordStatus(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Nowe hasło i potwierdzenie nie są takie same.");
      return;
    }

    try {
      const payload = await changePassword(auth.token, currentPassword, newPassword, confirmPassword);
      const authState = payload as AuthState;
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
      setAuth(authState);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setPasswordStatus("Zmieniono hasło.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Nie udało się zmienić hasła.");
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
            <button
              type="button"
              style={styles.subtleButton}
              onClick={() => setShowPasswordForm((current) => !current)}
            >
              Zmień hasło
            </button>
            <button type="button" style={styles.subtleButton} onClick={logout}>Wyloguj</button>
          </div>
          {passwordStatus ? <div style={{ ...styles.feedback, ...styles.success, marginTop: "12px" }}>{passwordStatus}</div> : null}
          {passwordError ? <div style={{ ...styles.feedback, ...styles.error, marginTop: "12px" }}>{passwordError}</div> : null}
          {showPasswordForm ? (
            <form
              style={{ ...styles.formGrid, maxWidth: "760px", marginTop: "16px" }}
              onSubmit={(event) => void submitPasswordChange(event)}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <label style={styles.field}>
                  <span style={styles.label}>Aktualne hasło</span>
                  <input
                    style={styles.input}
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Nowe hasło</span>
                  <input
                    style={styles.input}
                    type="password"
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Powtórz nowe hasło</span>
                  <input
                    style={styles.input}
                    type="password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </label>
              </div>
              <div style={styles.actions}>
                <button type="submit" style={styles.button}>Zapisz hasło</button>
                <button type="button" style={styles.subtleButton} onClick={() => setShowPasswordForm(false)}>
                  Anuluj
                </button>
              </div>
            </form>
          ) : null}
        </header>

        <nav style={styles.nav} aria-label="Nawigacja panelu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              style={view === item.id ? styles.button : styles.subtleButton}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {view === "parking" ? <ParkingLotsView token={auth.token} /> : null}
        {view === "sct" ? <SctRulesView token={auth.token} /> : null}
        {view === "users" ? <UsersView token={auth.token} /> : null}
        {view === "reports" ? <ReportsView token={auth.token} /> : null}
        {view === "iot" ? <IotView token={auth.token} /> : null}
      </div>
    </main>
  );
}
