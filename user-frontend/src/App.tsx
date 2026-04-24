import { useState } from "react";
import ParkingSearch from "./components/ParkingSearch";
import VehicleCheck from "./components/VehicleCheck";

type View = "parking" | "vehicle";

export default function App() {
  const [view, setView] = useState<View>("parking");

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__inner">
          <p className="eyebrow">Kraków Parking MVP</p>
          <h1>Wyszukuj parkingi i sprawdzaj zasady SCT</h1>
          <p className="hero__lead">
            Minimalna aplikacja użytkownika dla MVP. Pozwala znaleźć parkingi w promieniu
            od wskazanej lokalizacji i sprawdzić, czy samochód spełnia wymagania Strefy Czystego Transportu.
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
            Sprawdź auto
          </button>
        </nav>

        <section className="panel">
          {view === "parking" ? <ParkingSearch /> : <VehicleCheck />}
        </section>
      </main>
    </div>
  );
}
