import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getSctRules, saveSctRule, deleteSctRule } from "../api/client";
import type { SctRule, SctRuleForm } from "../api/types";
import { styles } from "../styles";
import { useToast } from "../components/Toast";

type Props = { token: string };

const emptyForm: SctRuleForm = {
  zone: "ZONE_A", fuelType: "DIESEL", minEmissionStandard: "EURO_5",
  allowed: true, validFrom: "2024-07-01", validTo: "", description: ""
};

export default function SctRulesView({ token }: Props) {
  const { showToast } = useToast();
  const [rules, setRules] = useState<SctRule[]>([]);
  const [form, setForm] = useState<SctRuleForm>(emptyForm);

  async function loadRules() {
    try {
      setRules(await getSctRules(token));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd ładowania reguł SCT.", "error");
    }
  }

  useEffect(() => { void loadRules(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveSctRule(form, token);
      showToast("Reguła SCT zapisana.");
      setForm(emptyForm);
      await loadRules();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd zapisu reguły.", "error");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteSctRule(id, token);
      showToast("Reguła SCT usunięta.");
      setForm(emptyForm);
      await loadRules();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd usuwania reguły.", "error");
    }
  }

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Reguły SCT</h2>
          <p style={styles.helper}>Aktualne reguły wjazdu do stref czystego transportu.</p>
        </div>
      </div>

      <form style={styles.formGrid} onSubmit={(e) => void handleSubmit(e)}>
        <div className="admin-form-row" style={styles.formRow}>
          <label style={styles.field}>
            <span style={styles.label}>Strefa</span>
            <select style={styles.input} value={form.zone} onChange={(e) => setForm((c) => ({ ...c, zone: e.target.value as SctRuleForm["zone"] }))}>
              <option value="ZONE_A">Strefa A</option>
              <option value="ZONE_B">Strefa B</option>
              <option value="ZONE_C">Strefa C</option>
            </select>
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Typ paliwa</span>
            <select style={styles.input} value={form.fuelType} onChange={(e) => setForm((c) => ({ ...c, fuelType: e.target.value as SctRuleForm["fuelType"] }))}>
              <option value="PETROL">Benzyna</option>
              <option value="DIESEL">Diesel</option>
              <option value="LPG">LPG</option>
              <option value="HYBRID">Hybryda</option>
              <option value="ELECTRIC">Elektryczny</option>
            </select>
          </label>
        </div>

        <div className="admin-form-row" style={styles.formRow}>
          <label style={styles.field}>
            <span style={styles.label}>Min. norma emisji</span>
            <select style={styles.input} value={form.minEmissionStandard} onChange={(e) => setForm((c) => ({ ...c, minEmissionStandard: e.target.value }))}>
              <option value="EURO_1">Euro 1</option>
              <option value="EURO_2">Euro 2</option>
              <option value="EURO_3">Euro 3</option>
              <option value="EURO_4">Euro 4</option>
              <option value="EURO_5">Euro 5</option>
              <option value="EURO_6">Euro 6</option>
              <option value="ELECTRIC">Elektryczny</option>
            </select>
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Wjazd dozwolony</span>
            <select style={styles.input} value={String(form.allowed)} onChange={(e) => setForm((c) => ({ ...c, allowed: e.target.value === "true" }))}>
              <option value="true">Tak</option>
              <option value="false">Nie</option>
            </select>
          </label>
        </div>

        <div className="admin-form-row" style={styles.formRow}>
          <label style={styles.field}>
            <span style={styles.label}>Ważna od</span>
            <input style={styles.input} type="date" value={form.validFrom} onChange={(e) => setForm((c) => ({ ...c, validFrom: e.target.value }))} />
          </label>
          <label style={styles.field}>
            <span style={styles.label}>Ważna do (puste = bezterminowo)</span>
            <input style={styles.input} type="date" value={form.validTo} onChange={(e) => setForm((c) => ({ ...c, validTo: e.target.value }))} />
          </label>
        </div>

        <label style={styles.field}>
          <span style={styles.label}>Opis / podstawa prawna</span>
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
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Reguła</th>
              <th style={styles.th}>Zakres czasowy</th>
              <th style={styles.th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td style={styles.td}><span style={{ ...styles.badge, fontSize: "11px" }}>#{rule.id}</span></td>
                <td style={styles.td}>
                  <strong>{rule.zone === "ZONE_A" ? "Strefa A" : rule.zone === "ZONE_B" ? "Strefa B" : "Strefa C"}</strong>
                  <div style={styles.helper}>
                    {rule.fuelType === "PETROL" ? "Benzyna" : rule.fuelType === "DIESEL" ? "Diesel" : rule.fuelType === "HYBRID" ? "Hybryda" : rule.fuelType === "ELECTRIC" ? "Elektryczny" : rule.fuelType}
                    {" • "}{rule.minEmissionStandard.replace("_", " ").replace("EURO", "Euro")}
                    {" • "}{rule.allowed ? "Dozwolony" : "Zabroniony"}
                  </div>
                  {rule.description ? <div style={styles.helper}>{rule.description}</div> : null}
                </td>
                <td style={styles.td}>
                  {rule.validFrom}{rule.validTo ? ` – ${rule.validTo}` : " – bezterminowo"}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button type="button" style={styles.subtleButton} onClick={() => setForm({
                      id: rule.id, zone: rule.zone, fuelType: rule.fuelType,
                      minEmissionStandard: rule.minEmissionStandard, allowed: rule.allowed,
                      validFrom: rule.validFrom, validTo: rule.validTo ?? "", description: rule.description ?? ""
                    })}>
                      Edytuj
                    </button>
                    <button type="button" style={styles.dangerButton} onClick={() => void handleDelete(rule.id)}>
                      Usuń
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 ? (
              <tr><td style={styles.td} colSpan={4}>Brak reguł SCT.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
