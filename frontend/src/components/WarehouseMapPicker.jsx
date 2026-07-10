import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import L from "leaflet";

// Fix default marker icon issue
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl,
  shadowUrl,
});

L.Marker.prototype.options.icon = defaultIcon;

function LocationSelector({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });
    },
  });

  return null;
}

export default function WarehouseMapPicker({ onSelect }) {
  const [position, setPosition] = useState(null);

  const handleSelect = (pos) => {
    setPosition(pos);
    if (onSelect) onSelect(pos);
  };

  return (
    <div>
      <MapContainer
        center={[6.9271, 79.8612]} // Colombo default
        zoom={12}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <LocationSelector setPosition={handleSelect} />

        {position && (
          <Marker position={[position.lat, position.lng]} />
        )}
      </MapContainer>

      {position && (
        <div style={{ marginTop: "10px" }}>
          <strong>Selected Location:</strong>
          <br />
          Lat: {position.lat.toFixed(6)}
          <br />
          Lng: {position.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
}