export default function Compass({ direction, degrees, speed }) {
  const hasReading = Number.isFinite(degrees) && Number.isFinite(speed);
  const needleRotation = hasReading ? degrees : 0;

  return (
    <div className="map-compass">
      {hasReading && <div className="map-compass-title">Wind</div>}
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r="30" fill="#fcfcfb" stroke="#c3c2b7" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="24" fill="none" stroke="#e1e0d9" strokeWidth="1" />

        <g stroke="#c3c2b7" strokeWidth="1">
          <line x1="32" y1="8" x2="32" y2="12" />
          <line x1="32" y1="52" x2="32" y2="56" />
          <line x1="8" y1="32" x2="12" y2="32" />
          <line x1="52" y1="32" x2="56" y2="32" />
        </g>

        <g transform={`rotate(${needleRotation} 32 32)`}>
          <polygon points="32,12 27,32 32,29 37,32" fill={hasReading ? '#16a34a' : '#c3c2b7'} />
          <polygon points="32,52 27,32 32,35 37,32" fill="#c3c2b7" />
        </g>
        <circle cx="32" cy="32" r="2.5" fill="#0b0b0b" />

        <text x="32" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0b0b0b">N</text>
        <text x="32" y="48.5" textAnchor="middle" fontSize="8" fill="#898781">S</text>
        <text x="16.5" y="35" textAnchor="middle" fontSize="8" fill="#898781">W</text>
        <text x="47.5" y="35" textAnchor="middle" fontSize="8" fill="#898781">E</text>
      </svg>
      {hasReading && (
        <div className="map-compass-reading">
          <strong>{direction}</strong> {degrees}&deg; &middot; {speed?.toFixed(1)} m/s
        </div>
      )}
    </div>
  );
}
