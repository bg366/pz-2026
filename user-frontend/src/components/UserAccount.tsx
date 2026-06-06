import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  login,
  register,
  updateProfile,
  changePassword,
  getVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  setActiveVehicle,
  saveAuth,
  clearAuth
} from "../api/client";
import type { AuthState, FuelType, EmissionStandard, UserVehicle, UserVehicleRequest } from "../api/types";

export type { AuthState, UserVehicle };

function validatePassword(pw: string): string[] {
  const errors: string[] = [];
  if (pw.length < 8) errors.push("Min. 8 znaków");
  if (!/[A-Z]/.test(pw)) errors.push("Przynajmniej jedna wielka litera");
  if (!/[a-z]/.test(pw)) errors.push("Przynajmniej jedna mała litera");
  if (!/[0-9]/.test(pw)) errors.push("Przynajmniej jedna cyfra");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("Przynajmniej jeden znak specjalny (!@#$%...)");
  return errors;
}

const FUEL_LABELS: Record<string, string> = { PETROL: "Benzyna", DIESEL: "Diesel", LPG: "LPG", HYBRID: "Hybryda", ELECTRIC: "Elektryczny" };
const EMISSION_LABELS: Record<string, string> = { EURO_1: "Euro 1", EURO_2: "Euro 2", EURO_3: "Euro 3", EURO_4: "Euro 4", EURO_5: "Euro 5", EURO_6: "Euro 6", ELECTRIC: "Elektryczny" };

function fuelLabel(key: string): string { return FUEL_LABELS[key] ?? key; }
function emissionLabel(key: string): string { return EMISSION_LABELS[key] ?? key; }

type UserAccountProps = {
  auth: AuthState | null;
  onAuthChange: (auth: AuthState | null) => void;
  onActiveVehicleChange: (vehicle: UserVehicle | null) => void;
};

type VehicleFormState = {
  brand: string;
  model: string;
  registrationNumber: string;
  fuelType: FuelType;
  emissionStandard: EmissionStandard;
  productionYear: string;
  vehicleType: string;
  active: boolean;
};

const emptyVehicle: VehicleFormState = {
  brand: "",
  model: "",
  registrationNumber: "",
  fuelType: "PETROL",
  emissionStandard: "EURO_6",
  productionYear: "2020",
  vehicleType: "CAR",
  active: true
};

export default function UserAccount({ auth, onAuthChange, onActiveVehicleChange }: UserAccountProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("Jan");
  const [lastName, setLastName] = useState("Kierowca");
  const [email, setEmail] = useState("user@krakow-parking.local");
  const [password, setPassword] = useState("User12345!");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(emptyVehicle);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadVehicles() {
    const payload = await getVehicles();
    setVehicles(payload);
    onActiveVehicleChange(payload.find((v) => v.active) ?? null);
  }

  useEffect(() => {
    if (!auth) {
      setVehicles([]);
      onActiveVehicleChange(null);
      return;
    }
    setProfileFirstName(auth.firstName);
    setProfileLastName(auth.lastName);
    void loadVehicles().catch((requestError) =>
      setError(requestError instanceof Error ? requestError.message : "Nie udało się pobrać pojazdów.")
    );
  }, [auth]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (mode === "register") {
      const pwErrors = validatePassword(password);
      if (pwErrors.length > 0) {
        setError("Hasło nie spełnia wymagań: " + pwErrors.join(", ") + ".");
        return;
      }
      if (password !== registerConfirmPassword) {
        setError("Hasło i jego potwierdzenie nie są identyczne.");
        return;
      }
    }

    try {
      const payload =
        mode === "login"
          ? await login(email, password)
          : await register(firstName, lastName, email, password);
      saveAuth(payload);
      onAuthChange(payload);
      setStatus("Zalogowano.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się zalogować.");
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    try {
      const payload = await updateProfile(profileFirstName, profileLastName);
      const updatedAuth: AuthState = {
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        roles: payload.roles,
        token: auth?.token ?? ""
      };
      saveAuth(updatedAuth);
      onAuthChange(updatedAuth);
      setStatus("Zapisano profil.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się zapisać profilu.");
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const pwErrors = validatePassword(newPassword);
    if (pwErrors.length > 0) {
      setError("Nowe hasło nie spełnia wymagań: " + pwErrors.join(", ") + ".");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Nowe hasło i potwierdzenie nie są takie same.");
      return;
    }

    try {
      const payload = await changePassword(currentPassword, newPassword, confirmPassword);
      saveAuth(payload);
      onAuthChange(payload);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus("Zmieniono hasło.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się zmienić hasła.");
    }
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const data: UserVehicleRequest = {
      brand: vehicleForm.brand,
      model: vehicleForm.model,
      registrationNumber: vehicleForm.registrationNumber.toUpperCase(),
      fuelType: vehicleForm.fuelType as FuelType,
      emissionStandard: vehicleForm.emissionStandard as EmissionStandard,
      productionYear: Number(vehicleForm.productionYear),
      vehicleType: vehicleForm.vehicleType,
      active: vehicleForm.active
    };

    try {
      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, data);
        setStatus("Zapisano pojazd.");
      } else {
        await addVehicle(data);
        setStatus("Dodano pojazd.");
      }
      setVehicleForm(emptyVehicle);
      setEditingVehicleId(null);
      await loadVehicles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się zapisać pojazdu.");
    }
  }

  function editVehicle(vehicle: UserVehicle) {
    setEditingVehicleId(vehicle.id);
    setVehicleForm({
      brand: vehicle.brand,
      model: vehicle.model,
      registrationNumber: vehicle.registrationNumber,
      fuelType: vehicle.fuelType,
      emissionStandard: vehicle.emissionStandard,
      productionYear: String(vehicle.productionYear),
      vehicleType: vehicle.vehicleType,
      active: vehicle.active
    });
    setStatus("Edytujesz pojazd.");
    setError(null);
  }

  function cancelVehicleEdit() {
    setEditingVehicleId(null);
    setVehicleForm(emptyVehicle);
    setStatus(null);
  }

  async function handleSetActiveVehicle(vehicleId: number) {
    setError(null);
    setStatus(null);
    try {
      await setActiveVehicle(vehicleId);
      setStatus("Zmieniono aktywny pojazd.");
      await loadVehicles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się ustawić aktywnego pojazdu.");
    }
  }

  async function handleDeleteVehicle(vehicleId: number) {
    setError(null);
    setStatus(null);
    try {
      await deleteVehicle(vehicleId);
      setStatus("Usunięto pojazd.");
      await loadVehicles();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się usunąć pojazdu.");
    }
  }

  function logout() {
    clearAuth();
    onAuthChange(null);
    onActiveVehicleChange(null);
    setVehicles([]);
  }

  if (!auth) {
    return (
      <div className="stack">
        <div className="section-heading">
          <h2>{mode === "login" ? "Zaloguj się" : "Zarejestruj konto"}</h2>
          <p>Konto pozwala zapisać pojazdy i używać aktywnego pojazdu w wyszukiwarce.</p>
        </div>

        <form className="card form-grid" onSubmit={submitAuth}>
          {mode === "register" ? (
            <div className="form-grid form-grid--three">
              <label className="field">
                <span>Imię</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
              </label>
              <label className="field">
                <span>Nazwisko</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
              </label>
            </div>
          ) : null}

          <label className="field">
            <span>E-mail</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            <span>Hasło</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {mode === "register" ? (
            <>
              <label className="field">
                <span>Powtórz hasło</span>
                <input
                  type="password"
                  value={registerConfirmPassword}
                  onChange={(event) => setRegisterConfirmPassword(event.target.value)}
                  required
                />
              </label>
              {password.length > 0 ? (
                <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[
                    { ok: password.length >= 8, label: "8+ znaków" },
                    { ok: /[A-Z]/.test(password), label: "Wielka litera" },
                    { ok: /[a-z]/.test(password), label: "Mała litera" },
                    { ok: /[0-9]/.test(password), label: "Cyfra" },
                    { ok: /[^A-Za-z0-9]/.test(password), label: "Znak specjalny" },
                  ].map(({ ok, label }) => (
                    <span key={label} style={{ color: ok ? "#16a34a" : "#dc2626", fontWeight: 500 }}>
                      {ok ? "✓" : "✗"} {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {error ? <div className="feedback feedback--error">{error}</div> : null}

          <div className="form-actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Załóż konto" : "Mam konto"}
            </button>
            <button type="submit" className="button">
              {mode === "login" ? "Zaloguj" : "Zarejestruj"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="section-heading">
        <h2>Profil i pojazdy</h2>
        <p>{auth.firstName} {auth.lastName} — {auth.email}</p>
      </div>

      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={logout}>Wyloguj</button>
      </div>

      {status ? <div className="feedback feedback--empty">{status}</div> : null}
      {error ? <div className="feedback feedback--error">{error}</div> : null}

      <form className="card form-grid form-grid--three" onSubmit={submitProfile}>
        <label className="field">
          <span>Imię</span>
          <input value={profileFirstName} onChange={(event) => setProfileFirstName(event.target.value)} required />
        </label>
        <label className="field">
          <span>Nazwisko</span>
          <input value={profileLastName} onChange={(event) => setProfileLastName(event.target.value)} required />
        </label>
        <div className="form-actions form-grid__wide">
          <button type="submit" className="button">Zapisz profil</button>
        </div>
      </form>

      <form className="card form-grid form-grid--three" onSubmit={submitPassword}>
        <label className="field">
          <span>Aktualne hasło</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Nowe hasło</span>
          <input
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Powtórz nowe hasło</span>
          <input
            type="password"
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
        <div className="form-actions form-grid__wide">
          <button type="submit" className="button">Zmień hasło</button>
        </div>
      </form>

      <form className="card form-grid form-grid--three" onSubmit={submitVehicle}>
        <label className="field">
          <span>Marka</span>
          <input
            value={vehicleForm.brand}
            onChange={(event) => setVehicleForm((current) => ({ ...current, brand: event.target.value }))}
            required
          />
        </label>
        <label className="field">
          <span>Model</span>
          <input
            value={vehicleForm.model}
            onChange={(event) => setVehicleForm((current) => ({ ...current, model: event.target.value }))}
            required
          />
        </label>
        <label className="field">
          <span>Numer rejestracyjny</span>
          <input
            value={vehicleForm.registrationNumber}
            onChange={(event) =>
              setVehicleForm((current) => ({ ...current, registrationNumber: event.target.value.toUpperCase() }))
            }
            required
          />
        </label>
        <label className="field">
          <span>Paliwo</span>
          <select
            value={vehicleForm.fuelType}
            onChange={(event) => setVehicleForm((current) => ({ ...current, fuelType: event.target.value as FuelType }))}
          >
            <option value="PETROL">Benzyna</option>
            <option value="DIESEL">Diesel</option>
            <option value="LPG">LPG</option>
            <option value="HYBRID">Hybryda</option>
            <option value="ELECTRIC">Elektryczny</option>
          </select>
        </label>
        <label className="field">
          <span>Norma emisji</span>
          <select
            value={vehicleForm.emissionStandard}
            onChange={(event) =>
              setVehicleForm((current) => ({ ...current, emissionStandard: event.target.value as EmissionStandard }))
            }
          >
            <option value="EURO_1">Euro 1</option>
            <option value="EURO_2">Euro 2</option>
            <option value="EURO_3">Euro 3</option>
            <option value="EURO_4">Euro 4</option>
            <option value="EURO_5">Euro 5</option>
            <option value="EURO_6">Euro 6</option>
            <option value="ELECTRIC">Elektryczny</option>
          </select>
        </label>
        <label className="field">
          <span>Rok produkcji</span>
          <input
            type="number"
            value={vehicleForm.productionYear}
            onChange={(event) => setVehicleForm((current) => ({ ...current, productionYear: event.target.value }))}
            required
          />
        </label>

        <div className="form-actions form-grid__wide">
          <button type="submit" className="button">
            {editingVehicleId ? "Zapisz pojazd" : "Dodaj pojazd"}
          </button>
          {editingVehicleId ? (
            <button type="button" className="button button--ghost" onClick={cancelVehicleEdit}>
              Anuluj edycję
            </button>
          ) : null}
        </div>
      </form>

      <div className="results-grid">
        {vehicles.map((vehicle) => (
          <article key={vehicle.id} className="result-card">
            <div className="result-card__header">
              <div>
                <h3>{vehicle.brand} {vehicle.model}</h3>
                <p>{vehicle.registrationNumber} — {vehicle.productionYear}</p>
              </div>
              <span className={vehicle.active ? "badge badge--success" : "badge"}>
                {vehicle.active ? "Aktywny" : fuelLabel(vehicle.fuelType)}
              </span>
            </div>
            <dl className="details">
              <div><dt>Paliwo</dt><dd>{fuelLabel(vehicle.fuelType)}</dd></div>
              <div><dt>Norma emisji</dt><dd>{emissionLabel(vehicle.emissionStandard)}</dd></div>
              <div><dt>SCT</dt><dd>{vehicle.sctCompliant ? "Spełnia" : "Wymaga sprawdzenia"}</dd></div>
            </dl>
            <div className="result-card__actions">
              <button type="button" className="button button--ghost" onClick={() => editVehicle(vehicle)}>
                Edytuj
              </button>
              {!vehicle.active ? (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => void handleSetActiveVehicle(vehicle.id)}
                >
                  Ustaw aktywny
                </button>
              ) : null}
              <button
                type="button"
                className="button button--link"
                onClick={() => void handleDeleteVehicle(vehicle.id)}
              >
                Usuń
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
