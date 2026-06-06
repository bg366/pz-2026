import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

type Props = {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
};

function validCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

export default function OwnerLocationPicker({ latitude, longitude, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const safeLat = validCoordinate(latitude, longitude) ? latitude : 50.0615;
  const safeLng = validCoordinate(latitude, longitude) ? longitude : 19.9370;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([safeLat, safeLng], 14);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    markerRef.current = L.marker([safeLat, safeLng], { draggable: true }).addTo(map);
    markerRef.current.on("dragend", () => {
      const position = markerRef.current?.getLatLng();
      if (position) onChange(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
    });
    map.on("click", (event) => onChange(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6))));

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([safeLat, safeLng]);
    map.panTo([safeLat, safeLng]);
  }, [safeLat, safeLng]);

  return (
    <div className="location-picker">
      <div className="location-picker__map" ref={containerRef} />
    </div>
  );
}
