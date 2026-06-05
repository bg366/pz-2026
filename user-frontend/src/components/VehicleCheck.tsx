import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { UserVehicle } from "./UserAccount";

type FuelType = "" | "PETROL" | "DIESEL" | "LPG" | "HYBRID" | "ELECTRIC";
type EmissionStandard =
  | ""
  | "EURO_1"
  | "EURO_2"
  | "EURO_3"
  | "EURO_4"
  | "EURO_5"
  | "EURO_6"
  | "ELECTRIC";
type Zone = "ZONE_A" | "ZONE_B" | "ZONE_C";

type VehicleCheckResponse = {
  canEnter: boolean;
  reason: string;
};

type VehicleCheckProps = {
  activeVehicle: UserVehicle | null;
};

export default function VehicleCheck({ activeVehicle }: VehicleCheckProps) {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("");
  const [emissionStandard, setEmissionStandard] = useState<EmissionStandard>("");
  const [zone, setZone] = useState<Zone>("ZONE_A");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VehicleCheckResponse | null>(null);

  useEffect(() => {
    if (!activeVehicle) {
      return;
    }

    setRegistrationNumber(activeVehicle.registrationNumber);
    setFuelType(activeVehicle.fuelType);
    setEmissionStandard(activeVehicle.emissionStandard);
  }, [activeVehicle]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/vehicles/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          registrationNumber: registrationNumber || null,
          fuelType: fuelType || null,
          emissionStandard: emissionStandard || null,
          zone
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setResult((await response.json()) as VehicleCheckResponse);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się sprawdzić pojazdu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Czy moje auto wjedzie?</h2>
        <p>
          Wpisz numer rejestracyjny albo podaj ręcznie typ paliwa i normę emisji.
          Backend zwróci decyzję oraz powód zgodny z regułami SCT.
        </p>
      </div>

      <form className="card form-grid" onSubmit={handleSubmit}>
        {activeVehicle ? (
          <div className="feedback feedback--empty">
            Aktywny pojazd: {activeVehicle.brand} {activeVehicle.model}, {activeVehicle.registrationNumber}.
          </div>
        ) : null}

        <label className="field">
          <span>Numer rejestracyjny</span>
          <input
            value={registrationNumber}
            onChange={(event) => setRegistrationNumber(event.target.value.toUpperCase())}
            placeholder="KR1234A"
          />
        </label>

        <label className="field">
          <span>Typ paliwa</span>
          <select value={fuelType} onChange={(event) => setFuelType(event.target.value as FuelType)}>
            <option value="">Wybierz</option>
            <option value="PETROL">PETROL</option>
            <option value="DIESEL">DIESEL</option>
            <option value="LPG">LPG</option>
            <option value="HYBRID">HYBRID</option>
            <option value="ELECTRIC">ELECTRIC</option>
          </select>
        </label>

        <label className="field">
          <span>Norma emisji</span>
          <select
            value={emissionStandard}
            onChange={(event) => setEmissionStandard(event.target.value as EmissionStandard)}
          >
            <option value="">Wybierz</option>
            <option value="EURO_1">EURO_1</option>
            <option value="EURO_2">EURO_2</option>
            <option value="EURO_3">EURO_3</option>
            <option value="EURO_4">EURO_4</option>
            <option value="EURO_5">EURO_5</option>
            <option value="EURO_6">EURO_6</option>
            <option value="ELECTRIC">ELECTRIC</option>
          </select>
        </label>

        <label className="field">
          <span>Strefa</span>
          <select value={zone} onChange={(event) => setZone(event.target.value as Zone)}>
            <option value="ZONE_A">ZONE_A</option>
            <option value="ZONE_B">ZONE_B</option>
            <option value="ZONE_C">ZONE_C</option>
          </select>
        </label>

        <button type="submit" className="button" disabled={loading}>
          {loading ? "Sprawdzanie..." : "Sprawdź pojazd"}
        </button>
      </form>

      {error ? <div className="feedback feedback--error">{error}</div> : null}

      {result ? (
        <article className="card result-card">
          <div className="result-card__header">
            <div>
              <h3>{result.canEnter ? "Wjazd dozwolony" : "Wjazd zakazany"}</h3>
              <p>Decyzja backendu dla wskazanej strefy SCT.</p>
            </div>
            <span className={result.canEnter ? "badge badge--success" : "badge badge--danger"}>
              {result.canEnter ? "OK" : "NIE"}
            </span>
          </div>

          <p className="result-reason">{result.reason}</p>
        </article>
      ) : null}
    </div>
  );
}
