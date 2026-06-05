import { useEffect, useState } from "react";
import {
  getUsers,
  getUserDetails,
  updateUserRole,
  updateUserStatus,
  resetUserPassword
} from "../api/client";
import type { AdminUser, AdminUserDetails, UserRole, UserStatus } from "../api/types";
import { styles } from "../styles";

type Props = { token: string };

export default function UsersView({ token }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const list = await getUsers(token);
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania użytkowników.");
    }
  }

  async function loadUserDetails(id: number) {
    try {
      setSelectedUser(await getUserDetails(id, token));
      setTemporaryPassword(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania użytkownika.");
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function handleRoleChange(id: number, role: UserRole) {
    setError(null);
    setStatus(null);
    try {
      await updateUserRole(id, role, token);
      setStatus("Zmieniono rolę użytkownika.");
      await loadUsers();
      if (selectedUser?.id === id) await loadUserDetails(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zmiany roli.");
    }
  }

  async function handleStatusChange(id: number, userStatus: UserStatus) {
    setError(null);
    setStatus(null);
    try {
      await updateUserStatus(id, userStatus, token);
      setStatus("Zmieniono status użytkownika.");
      await loadUsers();
      if (selectedUser?.id === id) await loadUserDetails(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zmiany statusu.");
    }
  }

  async function handlePasswordReset(id: number) {
    setError(null);
    setStatus(null);
    try {
      const result = await resetUserPassword(id, token);
      setTemporaryPassword(result.temporaryPassword);
      setStatus("Wygenerowano hasło tymczasowe.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd resetu hasła.");
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

      {status ? <div style={{ ...styles.feedback, ...styles.success }}>{status}</div> : null}
      {error ? <div style={{ ...styles.feedback, ...styles.error }}>{error}</div> : null}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
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
                  <strong>{user.firstName} {user.lastName}</strong>
                  <div style={styles.helper}>{user.email}</div>
                </td>
                <td style={styles.td}>
                  <select
                    style={styles.input}
                    value={user.role}
                    onChange={(e) => void handleRoleChange(user.id, e.target.value as UserRole)}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="PARKING_OWNER">PARKING_OWNER</option>
                    <option value="USER">USER</option>
                  </select>
                </td>
                <td style={styles.td}>
                  <select
                    style={styles.input}
                    value={user.status}
                    onChange={(e) => void handleStatusChange(user.id, e.target.value as UserStatus)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="DELETED">DELETED</option>
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

      {temporaryPassword ? (
        <div style={{ ...styles.feedback, ...styles.success, marginTop: "16px" }}>
          Hasło tymczasowe: <strong>{temporaryPassword}</strong>
        </div>
      ) : null}

      {selectedUser ? (
        <div style={{ ...styles.summaryCard, marginTop: "20px" }}>
          <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
          <div style={styles.helper}>
            {selectedUser.email} — {selectedUser.role} — {selectedUser.status}
          </div>
          <div style={{ ...styles.tableWrapper, marginTop: "12px" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Pojazd</th>
                  <th style={styles.th}>Rejestracja</th>
                  <th style={styles.th}>SCT</th>
                </tr>
              </thead>
              <tbody>
                {selectedUser.vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td style={styles.td}>
                      <strong>{vehicle.brand} {vehicle.model}</strong>
                      <div style={styles.helper}>{vehicle.fuelType} — {vehicle.emissionStandard}</div>
                    </td>
                    <td style={styles.td}>
                      {vehicle.registrationNumber}
                      {vehicle.active ? <div style={styles.helper}>aktywny</div> : null}
                    </td>
                    <td style={styles.td}>{vehicle.sctCompliant ? "Spełnia" : "Nie spełnia"}</td>
                  </tr>
                ))}
                {selectedUser.vehicles.length === 0 ? (
                  <tr><td style={styles.td} colSpan={3}>Brak zapisanych pojazdów.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
