import { useEffect, useState } from "react";
import { getUsers, getUserDetails, updateUserRole, updateUserStatus, resetUserPassword } from "../api/client";
import type { AdminUser, AdminUserDetails, UserRole, UserStatus } from "../api/types";
import { styles } from "../styles";
import { useToast } from "../components/Toast";
import { PL, pl } from "../i18n";

type Props = { token: string };

export default function UsersView({ token }: Props) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  async function loadUsers() {
    try {
      setUsers(await getUsers(token));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd ładowania użytkowników.", "error");
    }
  }

  async function loadUserDetails(id: number) {
    try {
      setSelectedUser(await getUserDetails(id, token));
      setTemporaryPassword(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd ładowania danych użytkownika.", "error");
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function handleRoleChange(id: number, role: UserRole) {
    try {
      await updateUserRole(id, role, token);
      showToast("Rola użytkownika zmieniona.");
      await loadUsers();
      if (selectedUser?.id === id) await loadUserDetails(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd zmiany roli.", "error");
    }
  }

  async function handleStatusChange(id: number, userStatus: UserStatus) {
    try {
      await updateUserStatus(id, userStatus, token);
      showToast("Status użytkownika zmieniony.");
      await loadUsers();
      if (selectedUser?.id === id) await loadUserDetails(id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd zmiany statusu.", "error");
    }
  }

  async function handlePasswordReset(id: number) {
    try {
      const result = await resetUserPassword(id, token);
      setTemporaryPassword(result.temporaryPassword);
      showToast("Wygenerowano hasło tymczasowe.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd resetu hasła.", "error");
    }
  }

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Użytkownicy</h2>
          <p style={styles.helper}>Lista kont, role, statusy i pojazdy użytkowników.</p>
        </div>
        <span style={styles.badge}>{users.length} kont</span>
      </div>

      {temporaryPassword ? (
        <div style={{ ...styles.feedback, ...styles.success, marginBottom: "16px" }}>
          Hasło tymczasowe: <strong>{temporaryPassword}</strong>
        </div>
      ) : null}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Użytkownik</th>
              <th style={styles.th}>Rola</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Pojazdy</th>
              <th style={styles.th}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, fontSize: "11px" }}>#{user.id}</span>
                </td>
                <td style={styles.td}>
                  <strong>{user.firstName} {user.lastName}</strong>
                  <div style={styles.helper}>{user.email}</div>
                </td>
                <td style={styles.td}>
                  <select style={{ ...styles.input, fontSize: "13px" }} value={user.role}
                    onChange={(e) => void handleRoleChange(user.id, e.target.value as UserRole)}>
                    <option value="ADMIN">Administrator</option>
                    <option value="PARKING_OWNER">Właściciel parkingu</option>
                    <option value="USER">Użytkownik</option>
                  </select>
                </td>
                <td style={styles.td}>
                  <select style={{ ...styles.input, fontSize: "13px" }} value={user.status}
                    onChange={(e) => void handleStatusChange(user.id, e.target.value as UserStatus)}>
                    <option value="ACTIVE">Aktywny</option>
                    <option value="BLOCKED">Zablokowany</option>
                    <option value="DELETED">Usunięty</option>
                  </select>
                </td>
                <td style={styles.td}>
                  {user.vehicleCount}
                  {user.activeVehicleRegistration ? (
                    <div style={styles.helper}>Aktywny: {user.activeVehicleRegistration}</div>
                  ) : null}
                </td>
                <td style={styles.td}>
                  <div style={styles.actions}>
                    <button type="button" style={styles.subtleButton} onClick={() => void loadUserDetails(user.id)}>
                      Szczegóły
                    </button>
                    <button type="button" style={styles.dangerButton} onClick={() => void handlePasswordReset(user.id)}>
                      Reset hasła
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser ? (
        <div style={{ ...styles.summaryCard, marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
            <div>
              <strong style={{ fontSize: "16px" }}>{selectedUser.firstName} {selectedUser.lastName}</strong>
              <div style={styles.helper}>
                ID: #{selectedUser.id} &bull; {selectedUser.email} &bull;{" "}
                {pl(PL.userRole, selectedUser.role)} &bull; {pl(PL.userStatus, selectedUser.status)}
              </div>
            </div>
            <button type="button" style={styles.subtleButton} onClick={() => setSelectedUser(null)}>Zamknij</button>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Pojazd</th>
                  <th style={styles.th}>Rejestracja</th>
                  <th style={styles.th}>SCT</th>
                </tr>
              </thead>
              <tbody>
                {selectedUser.vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, fontSize: "11px" }}>#{vehicle.id}</span>
                    </td>
                    <td style={styles.td}>
                      <strong>{vehicle.brand} {vehicle.model}</strong>
                      <div style={styles.helper}>
                        {pl(PL.fuelType, vehicle.fuelType)} — {pl(PL.emission, vehicle.emissionStandard)}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {vehicle.registrationNumber}
                      {vehicle.active ? <div style={styles.helper}>aktywny</div> : null}
                    </td>
                    <td style={styles.td}>{vehicle.sctCompliant ? "Spełnia" : "Nie spełnia"}</td>
                  </tr>
                ))}
                {selectedUser.vehicles.length === 0 ? (
                  <tr><td style={styles.td} colSpan={4}>Brak zapisanych pojazdów.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
