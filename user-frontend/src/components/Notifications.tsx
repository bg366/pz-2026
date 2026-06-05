import { useEffect, useState } from "react";
import type { AuthState, AppNotification } from "../api/types";
import { getNotifications, markNotificationRead } from "../api/client";

type Props = { auth: AuthState | null };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL");
}

function typeLabel(type: AppNotification["type"]): string {
  switch (type) {
    case "RESERVATION_CONFIRMED": return "Rezerwacja potwierdzona";
    case "RESERVATION_EXPIRING": return "Kończąca się rezerwacja";
    case "RESERVATION_EXPIRED": return "Rezerwacja wygasła";
  }
}

export default function Notifications({ auth }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!auth) return;
    setLoading(true);
    try {
      setItems(await getNotifications());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd ładowania powiadomień.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [auth]);

  async function handleRead(id: number) {
    try {
      const updated = await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch {
      // ignore
    }
  }

  if (!auth) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
        Zaloguj się, aby zobaczyć powiadomienia.
      </div>
    );
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
          Powiadomienia{unread > 0 ? ` (${unread} nowych)` : ""}
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
        >
          {loading ? "Ładowanie..." : "Odśwież"}
        </button>
      </div>

      {error ? (
        <div style={{ padding: "12px", background: "#fff1f2", color: "#be123c", borderRadius: "8px", marginBottom: "12px" }}>
          {error}
        </div>
      ) : null}

      {items.length === 0 && !loading ? (
        <div style={{ padding: "32px", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
          Brak powiadomień.
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((n) => (
          <div
            key={n.id}
            style={{
              padding: "14px 16px",
              borderRadius: "8px",
              border: `1px solid ${n.read ? "#e5e7eb" : "#bfdbfe"}`,
              background: n.read ? "#fff" : "#eff6ff",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start"
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb", marginBottom: "4px" }}>
                {typeLabel(n.type)}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#111827", marginBottom: "6px" }}>{n.message}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{formatDate(n.createdAt)}</div>
            </div>
            {!n.read ? (
              <button
                type="button"
                onClick={() => void handleRead(n.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #93c5fd",
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                Oznacz jako przeczytane
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
