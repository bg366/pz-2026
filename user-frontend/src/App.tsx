import { useEffect, useState } from "react";
import ParkingSearch from "./components/ParkingSearch";
import UserAccount from "./components/UserAccount";
import Reservations from "./components/Reservations";
import ParkingSessions from "./components/ParkingSessions";
import Notifications from "./components/Notifications";
import OwnerPanel from "./components/OwnerPanel";
import { readStoredAuth, getNotifications, getParkingSessions } from "./api/client";
import type { AuthState, UserVehicle, ParkingSession } from "./api/types";
import VehicleCheck from "./components/VehicleCheck";

type View = "parking" | "vehicle" | "profile" | "reservations" | "sessions" | "notifications" | "owner";

const VIEW_ROUTES: Record<View, string> = {
  parking: "/wyszukiwarka",
  vehicle: "/sprawdz-auto",
  profile: "/profil",
  reservations: "/rezerwacje",
  sessions: "/sesje",
  notifications: "/powiadomienia",
  owner: "/moje-parkingi"
};

function viewFromPath(pathname: string): View {
  const match = (Object.entries(VIEW_ROUTES) as [View, string][])
    .find(([, route]) => pathname === route || pathname === `${route}/`);
  return match?.[0] ?? "parking";
}

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());
  const [activeVehicle, setActiveVehicle] = useState<UserVehicle | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reservationParkingLotId, setReservationParkingLotId] = useState<number | null>(null);
  const [sessionParkingLotId, setSessionParkingLotId] = useState<number | null>(null);
  const [activeSessions, setActiveSessions] = useState<ParkingSession[]>([]);

  function navigate(nextView: View) {
    setView(nextView);
    const nextPath = VIEW_ROUTES[nextView];
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  }

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(null, "", VIEW_ROUTES[view]);
    }
    function handlePopState() {
      setView(viewFromPath(window.location.pathname));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!auth) {
      setUnreadCount(0);
      setActiveSessions([]);
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

    async function loadSessions() {
      try {
        const all = await getParkingSessions();
        setActiveSessions(all.filter((s) => s.status === "ACTIVE" || s.status === "PAYMENT_PENDING"));
      } catch {
        // ignore
      }
    }

    void loadUnread();
    void loadSessions();
    const interval = setInterval(() => void loadUnread(), 60 * 1000);
    return () => clearInterval(interval);
  }, [auth]);

  function refreshSessions() {
    if (!auth) return;
    getParkingSessions()
      .then((all) => setActiveSessions(all.filter((s) => s.status === "ACTIVE" || s.status === "PAYMENT_PENDING")))
      .catch(() => {});
  }

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
          <button type="button" className={view === "parking" ? "tab tab--active" : "tab"} onClick={() => navigate("parking")}>
            Wyszukiwarka
          </button>
          <button type="button" className={view === "vehicle" ? "tab tab--active" : "tab"} onClick={() => navigate("vehicle")}>
            Sprawdz auto
          </button>
          <button type="button" className={view === "profile" ? "tab tab--active" : "tab"} onClick={() => navigate("profile")}>
            Profil
          </button>
          <button type="button" className={view === "reservations" ? "tab tab--active" : "tab"} onClick={() => navigate("reservations")}>
            Rezerwacje
          </button>
          <button type="button" className={view === "sessions" ? "tab tab--active" : "tab"} onClick={() => navigate("sessions")}>
            Sesje
          </button>
          <button type="button" className={view === "notifications" ? "tab tab--active" : "tab"} onClick={() => { navigate("notifications"); setUnreadCount(0); }} style={{ position: "relative" }}>
            Powiadomienia
            {unreadCount > 0 ? (
              <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "#ef4444", color: "#fff", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700, padding: "1px 5px", lineHeight: "1.4" }}>
                {unreadCount}
              </span>
            ) : null}
          </button>
          {auth?.roles.includes("PARKING_OWNER") ? (
            <button type="button" className={view === "owner" ? "tab tab--active" : "tab"} onClick={() => navigate("owner")}>
              Moje parkingi
            </button>
          ) : null}
        </nav>

        <section className="panel">
          {view === "parking" ? (
            <ParkingSearch
              auth={auth}
              activeVehicle={activeVehicle}
              activeSessions={activeSessions}
              onSessionsChange={refreshSessions}
              onReserve={(parkingLotId) => {
                setReservationParkingLotId(parkingLotId);
                navigate("reservations");
              }}
              onStartSession={(parkingLotId) => {
                setSessionParkingLotId(parkingLotId);
                navigate("sessions");
              }}
            />
          ) : view === "vehicle" ? (
            <VehicleCheck activeVehicle={activeVehicle} />
          ) : view === "reservations" ? (
            <Reservations auth={auth} initialParkingId={reservationParkingLotId} />
          ) : view === "sessions" ? (
            <ParkingSessions auth={auth} initialParkingId={sessionParkingLotId} />
          ) : view === "notifications" ? (
            <Notifications auth={auth} />
          ) : view === "owner" ? (
            <OwnerPanel auth={auth} />
          ) : (
            <UserAccount auth={auth} onAuthChange={setAuth} onActiveVehicleChange={setActiveVehicle} />
          )}
        </section>
      </main>
    </div>
  );
}
