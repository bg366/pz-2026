import { useState } from "react";
import ParkingSearch from "./components/ParkingSearch";
import UserAccount, { readStoredAuth } from "./components/UserAccount";
import type { AuthState, UserVehicle } from "./components/UserAccount";
import VehicleCheck from "./components/VehicleCheck";

type View = "parking" | "vehicle" | "profile";

export default function App() {
  const [view, setView] = useState<View>("parking");
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());
  const [activeVehicle, setActiveVehicle] = useState<UserVehicle | null>(null);

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
        </nav>

        <section className="panel">
          {view === "parking" ? (
            <ParkingSearch activeVehicle={activeVehicle} />
          ) : view === "vehicle" ? (
            <VehicleCheck activeVehicle={activeVehicle} />
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
