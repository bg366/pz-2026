import type { CSSProperties } from "react";

export const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 20px",
    background:
      "radial-gradient(circle at top, rgba(248, 220, 183, 0.35), transparent 35%), linear-gradient(180deg, #fff8ef 0%, #fffefc 100%)",
    color: "#1f2937",
    fontFamily: '"Segoe UI", sans-serif'
  },
  container: {
    maxWidth: "1320px",
    margin: "0 auto"
  },
  header: { marginBottom: "24px" },
  title: { margin: "0 0 8px", fontSize: "36px", fontWeight: 800 },
  lead: { margin: 0, maxWidth: "760px", color: "#5b6475", lineHeight: 1.6 },
  grid: { display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start" },
  stack: { display: "grid", gap: "24px" },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid rgba(162, 123, 92, 0.18)",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 18px 40px rgba(98, 68, 40, 0.08)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px"
  },
  sectionTitle: { margin: 0, fontSize: "22px" },
  helper: { margin: "8px 0 0", color: "#6b7280", lineHeight: 1.5 },
  button: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 16px",
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#9a3412",
    cursor: "pointer"
  },
  subtleButton: {
    border: "1px solid rgba(154, 52, 18, 0.15)",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 700,
    color: "#9a3412",
    backgroundColor: "#fff7ed",
    cursor: "pointer"
  },
  dangerButton: {
    border: "none",
    borderRadius: "999px",
    padding: "8px 14px",
    fontWeight: 700,
    color: "#ffffff",
    backgroundColor: "#be123c",
    cursor: "pointer"
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: {
    textAlign: "left" as const,
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#7c5c46",
    padding: "0 0 12px"
  },
  td: { padding: "14px 0", borderTop: "1px solid rgba(162, 123, 92, 0.14)", verticalAlign: "top" as const },
  actions: { display: "flex", flexWrap: "wrap" as const, gap: "8px" },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    backgroundColor: "#ffedd5",
    color: "#9a3412",
    fontSize: "12px",
    fontWeight: 700
  },
  feedback: { padding: "12px 14px", borderRadius: "12px", fontSize: "14px" },
  error: { backgroundColor: "#fff1f2", color: "#be123c" },
  success: { backgroundColor: "#ecfdf5", color: "#047857" },
  formGrid: { display: "grid", gap: "12px" },
  formRow: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" },
  field: { display: "grid", gap: "8px" },
  label: { fontSize: "14px", fontWeight: 700, color: "#7c2d12" },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    borderRadius: "12px",
    border: "1px solid rgba(124, 45, 18, 0.18)",
    padding: "12px 14px",
    fontSize: "14px",
    backgroundColor: "#fffefc"
  },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" },
  summaryCard: {
    padding: "16px",
    borderRadius: "16px",
    backgroundColor: "#fff7ed",
    border: "1px solid rgba(154, 52, 18, 0.12)"
  },
  nav: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap" as const
  }
} satisfies Record<string, CSSProperties>;
