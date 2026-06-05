import { useEffect, useState } from "react";
import ParkingSearch from "./components/ParkingSearch";
import UserAccount from "./components/UserAccount";
import Reservations from "./components/Reservations";
import Notifications from "./components/Notifications";
import { readStoredAuth, getNotifications } from "./api/client";
import type { AuthState, UserVehicle } from "./api/types";
import VehicleCheck from "./components/VehicleCheck";

type View = "parking" | "vehicle" | "profile" | "reservations" | "notifications";

export default function App() {
  const [view, setView] = useState<View>("parking");
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());
  const [activeVehicle, setActiveVehicle] = useState<UserVehicle | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth) {
      setUnreadCount(0);
      return;
    }

    async function loadUnread() {
      try {
        const notifications = await getNotifications();
        setUnreadCount(notifications.filter((n) => !n.read).length);
      } catch {
        // ignore
      }
    }

    void loadUnread();
    const interval = setInterval(() => void loadUnread(), 60 * 1000);
    return () => clearInterval(interval);
  }, [auth]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__inner">
          <p className="eyebrow">Krakow Parking MVP</p>
          <h1>Wyszukuj parkingi i sprawdzaj zasady SCT</h1>
          <p className="hero__lead">
            Minimalna aplikacja uzytkownika dla MVP. Pozwala znalezc parkingi w promieniu
            od wskazanej lokalizacji i sprawdzic, czy samochod spelnia wymagania Strefy
            Czystego Transportu.
          </p>
        </div>
      </header>

      <main className="page">
        <nav className="tabs" aria-label="Nawigacja aplikacji">
          <button
            type="button"
            className={view === "parking" ? "tab tab--active" : "tab"}
            onClick={() => setView("parking")}
          >
            Wyszukiwarka
          </button>
          <button
            type="button"
            className={view === "vehicle" ? "tab tab--active" : "tab"}
            onClick={() => setView("vehicle")}
          >
            Sprawdz auto
          </button>
          <button
            type="button"
            className={view === "profile" ? "tab tab--active" : "tab"}
            onClick={() => setView("profile")}
          >
            Profil
          </button>
          <button
            type="button"
            className={view === "reservations" ? "tab tab--active" : "tab"}
            onClick={() => setView("reservations")}
          >
            Rezerwacje
          </button>
          <button
            type="button"
            className={view === "notifications" ? "tab tab--active" : "tab"}
            onClick={() => { setView("notifications"); setUnreadCount(0); }}
            style={{ position: "relative" }}
          >
            Powiadomienia
            {unreadCount > 0 ? (
              <span style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                background: "#ef4444",
                color: "#fff",
                borderRadius: "999px",
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "1px 5px",
                lineHeight: "1.4"
              }}>
                {unreadCount}
              </span>
            ) : null}
          </button>
        </nav>

        <section className="panel">
          {view === "parking" ? (
            <ParkingSearch activeVehicle={activeVehicle} />
          ) : view === "vehicle" ? (
            <VehicleCheck activeVehicle={activeVehicle} />
          ) : view === "reservations" ? (
            <Reservations auth={auth} />
          ) : view === "notifications" ? (
            <Notifications auth={auth} />
          ) : (
            <UserAccount
              auth={auth}
              onAuthChange={setAuth}
              onActiveVehicleChange={setActiveVehicle}
            />
          )}
        </section>
      </main>
    </div>
  );
}
