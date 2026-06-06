import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { login, register, saveAuth } from "../api/client";
import type { AuthState } from "../api/types";

export type AuthMode = "login" | "register";

type AuthPageProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onBack: () => void;
  onAuthChange: (auth: AuthState) => void;
  darkMode: boolean;
  onToggleDark: () => void;
};

function validatePassword(pw: string): string[] {
  const errors: string[] = [];
  if (pw.length < 8) errors.push("min. 8 znaków");
  if (!/[A-Z]/.test(pw)) errors.push("wielka litera");
  if (!/[a-z]/.test(pw)) errors.push("mała litera");
  if (!/[0-9]/.test(pw)) errors.push("cyfra");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("znak specjalny");
  return errors;
}

export default function AuthPage({ mode, onModeChange, onBack, onAuthChange, darkMode, onToggleDark }: AuthPageProps) {
  const [firstName, setFirstName] = useState("Jan");
  const [lastName, setLastName] = useState("Kierowca");
  const [email, setEmail] = useState("user@krakow-parking.local");
  const [password, setPassword] = useState("User12345!");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(null);
    setError(null);
  }, [mode]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);

    if (mode === "register") {
      const pwErrors = validatePassword(password);
      if (pwErrors.length > 0) {
        setError("Hasło nie spełnia wymagań: " + pwErrors.join(", ") + ".");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Hasło i jego potwierdzenie nie są identyczne.");
        setLoading(false);
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
      onBack();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się wykonać operacji.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__topbar">
        <p className="eyebrow">Kraków Parking</p>
        <div className="auth-page__topbar-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleDark}
            aria-label={darkMode ? "Tryb jasny" : "Tryb ciemny"}
            title={darkMode ? "Tryb jasny" : "Tryb ciemny"}
          >
            {darkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/><path d="M20 12h2"/>
                <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            )}
          </button>
          <button type="button" className="button button--ghost button--sm" onClick={onBack}>
            ← Wróć do aplikacji
          </button>
        </div>
      </div>

      <div className="auth-page__body">
        <div className="auth-page__card">
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Konto kierowcy</p>
          <h1 className="auth-page__title">
            {mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
          </h1>
          <p className="auth-page__lead">
            {mode === "login"
              ? "Zarządzaj rezerwacjami, sesjami parkingowymi i swoim pojazdem."
              : "Dołącz do systemu i korzystaj z pełni możliwości parkowania w Krakowie."}
          </p>

          <form className="form-grid" onSubmit={submitAuth}>
            {mode === "register" ? (
              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>Imię</span>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </label>
                <label className="field">
                  <span>Nazwisko</span>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </label>
              </div>
            ) : null}

            <label className="field">
              <span>E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label className="field">
              <span>Hasło</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>

            {mode === "register" ? (
              <>
                <label className="field">
                  <span>Powtórz hasło</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </label>
                <div className="password-rules">
                  {[
                    { ok: password.length >= 8, label: "8+ znaków" },
                    { ok: /[A-Z]/.test(password), label: "Wielka litera" },
                    { ok: /[a-z]/.test(password), label: "Mała litera" },
                    { ok: /[0-9]/.test(password), label: "Cyfra" },
                    { ok: /[^A-Za-z0-9]/.test(password), label: "Znak specjalny" },
                  ].map(({ ok, label }) => (
                    <span key={label} className={ok ? "password-rule password-rule--ok" : "password-rule"}>
                      {ok ? "✓" : "·"} {label}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            {status ? <div className="feedback feedback--success">{status}</div> : null}
            {error ? <div className="feedback feedback--error">{error}</div> : null}

            <button type="submit" className="button" disabled={loading} style={{ width: "100%" }}>
              {loading
                ? mode === "login" ? "Logowanie…" : "Rejestrowanie…"
                : mode === "login" ? "Zaloguj się" : "Zarejestruj się"}
            </button>

            <p className="auth-page__switch">
              {mode === "login" ? "Nie masz konta? " : "Masz już konto? "}
              <button
                type="button"
                className="auth-page__switch-btn"
                onClick={() => onModeChange(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Zarejestruj się" : "Zaloguj się"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
