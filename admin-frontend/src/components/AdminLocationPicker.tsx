import type { CSSProperties, MouseEvent } from "react";

type Props = {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
};

const zoom = 15;
const tileSize = 256;

const wrap: CSSProperties = {
  position: "relative",
  height: "320px",
  overflow: "hidden",
  borderRadius: "14px",
  border: "1px solid rgba(124, 45, 18, 0.18)",
  backgroundColor: "#f8fafc",
  cursor: "crosshair"
};

const marker: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "18px",
  height: "18px",
  borderRadius: "999px",
  border: "3px solid #ffffff",
  backgroundColor: "#9a3412",
  boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
  transform: "translate(-50%, -50%)",
  pointerEvents: "none"
};

const tileImg: CSSProperties = {
  position: "absolute",
  width: `${tileSize}px`,
  height: `${tileSize}px`,
  userSelect: "none"
};

function validCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function lngToTileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * 2 ** z;
}

function latToTileY(lat: number, z: number): number {
  const rad = lat * Math.PI / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** z;
}

function tileXToLng(x: number, z: number): number {
  return x / 2 ** z * 360 - 180;
}

function tileYToLat(y: number, z: number): number {
  const n = Math.PI - 2 * Math.PI * y / 2 ** z;
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export default function AdminLocationPicker({ latitude, longitude, onChange }: Props) {
  const safeLat = validCoordinate(latitude, longitude) ? latitude : 50.0615;
  const safeLng = validCoordinate(latitude, longitude) ? longitude : 19.9370;
  const centerX = lngToTileX(safeLng, zoom);
  const centerY = latToTileY(safeLat, zoom);
  const baseX = Math.floor(centerX);
  const baseY = Math.floor(centerY);
  const offsetX = (centerX - baseX) * tileSize;
  const offsetY = (centerY - baseY) * tileSize;
  const tiles = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => ({ dx, dy })));

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const pixelX = event.clientX - rect.left - rect.width / 2;
    const pixelY = event.clientY - rect.top - rect.height / 2;
    const nextX = centerX + pixelX / tileSize;
    const nextY = centerY + pixelY / tileSize;
    onChange(
      Number(tileYToLat(nextY, zoom).toFixed(6)),
      Number(tileXToLng(nextX, zoom).toFixed(6))
    );
  }

  return (
    <div style={wrap} onClick={handleClick} role="button" tabIndex={0}>
      {tiles.map(({ dx, dy }) => (
        <img
          key={`${dx}:${dy}`}
          src={`https://tile.openstreetmap.org/${zoom}/${baseX + dx}/${baseY + dy}.png`}
          alt=""
          draggable={false}
          style={{
            ...tileImg,
            left: `calc(50% + ${dx * tileSize - offsetX}px)`,
            top: `calc(50% + ${dy * tileSize - offsetY}px)`
          }}
        />
      ))}
      <div style={marker} />
    </div>
  );
}
