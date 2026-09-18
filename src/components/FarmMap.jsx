import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { polygonCentroid } from '../data/farmBoundaries';
import { windDirectionLabel, windDirectionDegrees } from '../theme/metrics';
import Compass from './Compass';

// The pin sits on the device; the latest wind speed rides in a bubble above
// it, with an arrow turned to the wind direction when one is known.
function deviceIcon(speed, degrees) {
  const arrow = Number.isFinite(degrees)
    ? `<svg class="wind-marker-arrow" viewBox="0 0 24 24" style="transform:rotate(${degrees}deg)"><path d="M12 3v18M12 3l-5 5M12 3l5 5"/></svg>`
    : '';
  const bubble = Number.isFinite(speed)
    ? `<div class="wind-marker-bubble">${arrow}${speed.toFixed(1)} m/s</div>`
    : '';
  return L.divIcon({
    className: 'farm-marker',
    html: `${bubble}<div class="farm-marker-pin"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

export default function FarmMap({ polygon, point, location, areaHectares, latestRow }) {
  const [layer, setLayer] = useState('satellite');
  // A saved device coordinate wins over the farm polygon's centroid.
  const center = point ?? polygonCentroid(polygon);
  const positions = polygon?.map((p) => [p.lat, p.lng]);

  const windSpeed = latestRow ? Number(latestRow.wind_speed) : null;
  const windDir = latestRow?.wind_direction;
  const windDegrees = windDir != null ? windDirectionDegrees(windDir, latestRow?.wind_direction_degrees) : null;
  const icon = useMemo(() => deviceIcon(windSpeed, windDegrees), [windSpeed, windDegrees]);

  return (
    <div className="farm-map-wrap">
      <div className="map-toolbar">
        <button
          type="button"
          className={`map-toggle-btn${layer === 'street' ? ' active' : ''}`}
          onClick={() => setLayer('street')}
        >
          Street
        </button>
        <button
          type="button"
          className={`map-toggle-btn${layer === 'satellite' ? ' active' : ''}`}
          onClick={() => setLayer('satellite')}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={16}
        scrollWheelZoom={false}
        className="farm-map"
      >
        <TileLayer
          key={layer}
          attribution={TILE_LAYERS[layer].attribution}
          url={TILE_LAYERS[layer].url}
        />
        {positions && (
          <Polygon positions={positions} pathOptions={{ color: '#16a34a', weight: 2, fillColor: '#16a34a', fillOpacity: 0.15 }} />
        )}
        <Marker position={[center.lat, center.lng]} icon={icon}>
          <Popup>{location}</Popup>
        </Marker>
      </MapContainer>

      <Compass
        direction={windDir != null ? windDirectionLabel(windDir) : null}
        degrees={windDegrees}
        speed={windSpeed}
      />

      <div className="map-coords-overlay">
        {Math.abs(center.lat).toFixed(4)}&deg; {center.lat < 0 ? 'S' : 'N'}{' '}
        {Math.abs(center.lng).toFixed(4)}&deg; {center.lng < 0 ? 'W' : 'E'}
        {areaHectares > 0 && <> &middot; {areaHectares.toFixed(2)} HA</>}
      </div>
    </div>
  );
}
