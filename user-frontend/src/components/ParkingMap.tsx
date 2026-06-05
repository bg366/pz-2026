import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParkingSearchResult } from "../api/types";

// Fix default marker icons broken by bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const orangeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function markerIcon(result: ParkingSearchResult): L.Icon {
  if (result.parkingPermission === "NOT_ALLOWED") return redIcon;
  if (result.parkingPermission === "SCT_SPOTS_ONLY") return orangeIcon;
  return greenIcon;
}

function popupHtml(result: ParkingSearchResult): string {
  const cost = result.predictedAmount != null && result.currency
    ? `${result.predictedAmount} ${result.currency}`
    : "—";
  const spots = `${result.availableSpots} wolnych (SCT: ${result.availableSctSpots})`;
  const permission =
    result.parkingPermission === "ALL_SPOTS" ? "Wszystkie miejsca"
    : result.parkingPermission === "SCT_SPOTS_ONLY" ? "Tylko miejsca SCT"
    : "Brak wjazdu";

  return `
    <strong style="font-size:14px">${result.name}</strong><br>
    <span style="color:#555;font-size:12px">${result.address}</span><br><br>
    <span>${result.zone} &bull; ${result.distanceKm} km &bull; ${result.openingHours}</span><br>
    <span>Miejsca: ${spots}</span><br>
    <span>SCT: <b>${permission}</b></span><br>
    <span>Szac. koszt: ${cost}</span><br>
    <div style="margin-top:8px">
      <a href="https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}"
         target="_blank" rel="noreferrer"
         style="color:#9a3412;font-size:12px">Google Maps ↗</a>
    </div>
  `;
}

type Props = {
  results: ParkingSearchResult[];
  centerLat: number;
  centerLng: number;
};

export default function ParkingMap({ results, centerLat, centerLng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([centerLat, centerLng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapRef.current);

    L.circleMarker([centerLat, centerLng], {
      radius: 8,
      color: "#9a3412",
      fillColor: "#9a3412",
      fillOpacity: 0.8
    })
      .addTo(mapRef.current)
      .bindPopup("Twoja lokalizacja");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    results.forEach((result) => {
      const marker = L.marker([result.latitude, result.longitude], { icon: markerIcon(result) })
        .addTo(map)
        .bindPopup(popupHtml(result), { maxWidth: 260 });
      markersRef.current.push(marker);
    });

    if (results.length > 0) {
      const group = L.featureGroup([
        L.marker([centerLat, centerLng]),
        ...markersRef.current
      ]);
      map.fitBounds(group.getBounds().pad(0.15));
    } else {
      map.setView([centerLat, centerLng], 13);
    }
  }, [results, centerLat, centerLng]);

  return (
    <div>
      <div ref={containerRef} style={{ height: "480px", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(154,52,18,0.15)" }} />
      <p style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
        Zielony = wolny wjazd &bull; Pomarańczowy = tylko miejsca SCT &bull; Czerwony = brak wjazdu
      </p>
    </div>
  );
}
