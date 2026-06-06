import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParkingSearchResult } from "../api/types";

function permissionColor(r: ParkingSearchResult): string {
  if (r.availableSpots <= 0) return "#9aa6b4";
  if (r.parkingPermission === "ALL_SPOTS") return "#16a34a";
  if (r.parkingPermission === "SCT_SPOTS_ONLY") return "#d68216";
  return "#dc2626";
}

function pinHtml(r: ParkingSearchResult, selected: boolean, dark: boolean): string {
  const c = permissionColor(r);
  const price = r.pricePerHour != null ? `${r.pricePerHour} zł` : "—";
  const bg = selected ? c : (dark ? "#15203a" : "#ffffff");
  const fg = selected ? "#ffffff" : c;
  return `<div style="display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;
    background:${bg};border:2px solid ${c};color:${fg};
    font-family:ui-monospace,monospace;font-weight:700;font-size:12px;
    white-space:nowrap;box-shadow:0 3px 10px rgba(15,27,45,0.28);cursor:pointer;
    transform:${selected ? "translateY(-3px) scale(1.1)" : "none"};
    transition:transform 0.14s ease;opacity:${r.availableSpots <= 0 ? "0.65" : "1"}">
    ${price}</div>`;
}

type Props = {
  results: ParkingSearchResult[];
  centerLat: number;
  centerLng: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  darkMode: boolean;
};

export default function CivicMap({ results, centerLat, centerLng, selectedId, onSelect, darkMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const centerMarkerRef = useRef<L.CircleMarker | null>(null);
  const resultsRef = useRef(results);
  resultsRef.current = results;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView([centerLat, centerLng], 13);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(
      darkMode
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 20, attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>' }
    ).addTo(map);
  }, [darkMode]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    centerMarkerRef.current?.remove();
    centerMarkerRef.current = L.circleMarker([centerLat, centerLng], {
      radius: 8, color: "#9a3412", fillColor: "#9a3412", fillOpacity: 0.85, weight: 2
    }).addTo(map).bindPopup("Twoja lokalizacja");
  }, [centerLat, centerLng]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const keep = new Set(results.map((r) => r.id));
    markersRef.current.forEach((m, id) => {
      if (!keep.has(id)) { m.remove(); markersRef.current.delete(id); }
    });
    results.forEach((r) => {
      const isSel = r.id === selectedId;
      const icon = L.divIcon({ html: pinHtml(r, isSel, darkMode), className: "", iconSize: [76, 30], iconAnchor: [38, 36] });
      const existing = markersRef.current.get(r.id);
      if (existing) {
        existing.setIcon(icon);
        existing.setZIndexOffset(isSel ? 1000 : 0);
      } else {
        const m = L.marker([r.latitude, r.longitude], { icon }).addTo(map);
        m.on("click", () => onSelect(r.id));
        markersRef.current.set(r.id, m);
      }
    });
    if (results.length > 0 && selectedId == null) {
      const bounds = L.latLngBounds(results.map((r) => [r.latitude, r.longitude]));
      bounds.extend([centerLat, centerLng]);
      map.fitBounds(bounds.pad(0.15));
    }
  }, [results, darkMode]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    resultsRef.current.forEach((r) => {
      const m = markersRef.current.get(r.id);
      if (!m) return;
      const isSel = r.id === selectedId;
      m.setIcon(L.divIcon({ html: pinHtml(r, isSel, darkMode), className: "", iconSize: [76, 30], iconAnchor: [38, 36] }));
      m.setZIndexOffset(isSel ? 1000 : 0);
    });
    const sel = resultsRef.current.find((r) => r.id === selectedId);
    if (sel) map.flyTo([sel.latitude, sel.longitude], 15, { duration: 0.6 });
  }, [selectedId]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
