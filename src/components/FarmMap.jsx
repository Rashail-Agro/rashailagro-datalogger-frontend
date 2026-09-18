import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { polygonCentroid } from '../data/farmBoundaries';
import { windDirectionLabel, windDirectionDegrees } from '../theme/metrics';
import Compass from './Compass';

const deviceIcon = L.divIcon({
  className: 'farm-marker',
  html: `<div class="farm-marker-pin"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

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
  const center = polygon ? polygonCentroid(polygon) : point;
  const positions = polygon?.map((p) => [p.lat, p.lng]);

  const windSpeed = latestRow ? Number(latestRow.wind_speed) : null;
  const windDir = latestRow?.wind_direction;

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
        <Marker position={[center.lat, center.lng]} icon={deviceIcon}>
          <Popup>{location}</Popup>
        </Marker>
      </MapContainer>

      <Compass
        direction={windDir != null ? windDirectionLabel(windDir) : null}
        degrees={windDir != null ? windDirectionDegrees(windDir, latestRow?.wind_direction_degrees) : null}
        speed={windSpeed}
      />

      <div className="map-coords-overlay">
        {center.lat.toFixed(4)}&deg; N {center.lng.toFixed(4)}&deg; E
        {areaHectares > 0 && <> &middot; {areaHectares.toFixed(2)} HA</>}
      </div>
    </div>
  );
}
