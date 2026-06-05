import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getSctRules, saveSctRule, deleteSctRule } from "../api/client";
import type { SctRule, SctRuleForm } from "../api/types";
import { styles } from "../styles";

type Props = { token: string };

const emptyForm: SctRuleForm = {
  zone: "ZONE_A",
  fuelType: "DIESEL",
  minEmissionStandard: "EURO_5",
  allowed: true,
  validFrom: "2024-07-01",
  validTo: "",
  description: ""
};

export default function SctRulesView({ token }: Props) {
  const [rules, setRules] = useState<SctRule[]>([]);
  const [form, setForm] = useState<SctRuleForm>(emptyForm);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRules() {
    try {
      setRules(await getSctRules(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania reguł SCT.");
    }
  }

  useEffect(() => { void loadRules(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);
    try {
      await saveSctRule(form, token);
      setStatus("Zapisano regułę SCT.");
      setForm(emptyForm);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu.");
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    setStatus(null);
    try {
      await deleteSctRule(id, token);
      setStatus("Usunięto regułę SCT.");
      setForm(emptyForm);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd usuwania.");
    }
  }

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Reguły SCT</h2>
          <p style={styles.helper}>Aktualne reguły wjazdu do stref.</p>
        </div>
      </div>

      {status ? <div style={{ ...styles.feedback, ...styles.success }}>{status}</div> : null}
      {error ? <div style={{ ...styles.feedback, ...styles.error }}>{error}</div> : null}

      <form style={styles.formGrid} onSubmit={(e) => void handleSubmit(e)}>
        <div style={styles.formRow}>
          <label style={styles.field}>
            <span style={styles.label}>Strefa</span>
            <select style={styles.input} value={form.zone} onChange={(e) => setForm((c) => ({ ...c, zone: e.target.value as SctRuleForm["zone"] }))}>
              <option value="ZONE_A">ZONE_A</option>
              <option value="ZONE_B">ZONE_B</option>
              <option value="ZONE_C">ZONE_C</option>
            </select>
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Paliwo</span>
            <select style={styles.input} value={form.fuelType} onChange={(e) => setForm((c) => ({ ...c, fuelType: e.target.value as SctRuleForm["fuelType"] }))}>
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
            <select style={styles.input} value={form.minEmissionStandard} onChange={(e) => setForm((c) => ({ ...c, minEmissionStandard: e.target.value }))}>
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
            <select style={styles.input} value={String(form.allowed)} onChange={(e) => setForm((c) => ({ ...c, allowed: e.target.value === "true" }))}>
              <option value="true">TAK</option>
              <option value="false">NIE</option>
            </select>
          </label>
        </div>

        <div style={styles.formRow}>
          <label style={styles.field}>
            <span style={styles.label}>Ważna od</span>
            <input style={styles.input} type="date" value={form.validFrom} onChange={(e) => setForm((c) => ({ ...c, validFrom: e.target.value }))} />
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Ważna do</span>
            <input style={styles.input} type="date" value={form.validTo} onChange={(e) => setForm((c) => ({ ...c, validTo: e.target.value }))} />
          </label>
        </div>

        <label style={styles.field}>
          <span style={styles.label}>Opis</span>
          <input style={styles.input} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Opis uchwały lub wyjątku" />
        </label>

        <div style={styles.actions}>
          <button type="submit" style={styles.button}>{form.id ? "Zapisz regułę" : "Dodaj regułę"}</button>
          {form.id ? (
            <button type="button" style={styles.subtleButton} onClick={() => setForm(emptyForm)}>Anuluj edycję</button>
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
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td style={styles.td}>
                  <strong>{rule.zone}</strong>
                  <div style={styles.helper}>{rule.fuelType} • {rule.minEmissionStandard} • {rule.allowed ? "DOZWOLONY" : "ZABRONIONY"}</div>
                </td>
                <td style={styles.td}>
                  {rule.validFrom}{rule.validTo ? ` - ${rule.validTo}` : " - bezterminowo"}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button type="button" style={styles.subtleButton} onClick={() => setForm({ id: rule.id, zone: rule.zone, fuelType: rule.fuelType, minEmissionStandard: rule.minEmissionStandard, allowed: rule.allowed, validFrom: rule.validFrom, validTo: rule.validTo ?? "", description: rule.description ?? "" })}>
                      Edytuj
                    </button>
                    <button type="button" style={styles.dangerButton} onClick={() => void handleDelete(rule.id)}>
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
  );
}
