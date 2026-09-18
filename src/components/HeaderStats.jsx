import { useEffect, useState } from 'react';
import { batteryStatus, STATUS_COLORS } from '../theme/metrics';

function relativeAgo(date, now) {
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function BatteryIcon({ pct, color }) {
  const bars = Math.round((Math.min(100, Math.max(0, pct)) / 100) * 4);
  return (
    <svg viewBox="0 0 28 16" width="28" height="16">
      <rect x="1" y="1" width="22" height="14" rx="2" stroke="#0b0b0b" strokeWidth="1.5" fill="none" />
      <rect x="24" y="5" width="3" height="6" rx="1" fill="#0b0b0b" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={3.5 + i * 4.7}
          y="3"
          width="3.8"
          height="10"
          rx="0.5"
          fill={i < bars ? color : '#e1e0d9'}
        />
      ))}
    </svg>
  );
}

function SignalIcon({ bars }) {
  const heights = [5, 8, 11, 14];
  return (
    <svg viewBox="0 0 26 16" width="26" height="16">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 6.5}
          y={16 - h}
          width="4.5"
          height={h}
          rx="1"
          fill={i < bars ? '#0b0b0b' : '#e1e0d9'}
        />
      ))}
    </svg>
  );
}

export default function HeaderStats({ latestRow }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  if (!latestRow) return null;

  const battery = Number(latestRow.battery_level);
  const signal = Number(latestRow.signal);
  const created = latestRow.received_at ? new Date(latestRow.received_at) : null;

  const hasBattery = Number.isFinite(battery);
  const hasSignal = Number.isFinite(signal);
  const hasPacket = created && !Number.isNaN(created.getTime());

  if (!hasBattery && !hasSignal && !hasPacket) return null;

  const batteryColor = hasBattery ? STATUS_COLORS[batteryStatus(battery)] : '#0b0b0b';
  const signalBars = hasSignal ? Math.min(4, Math.max(1, Math.ceil((signal / 31) * 4))) : 0;

  return (
    <div className="header-stats">
      {hasBattery && (
        <div className="header-stat">
          <div className="header-stat-label">Battery</div>
          <div className="header-stat-value">
            <BatteryIcon pct={battery} color={batteryColor} />
            {battery.toFixed(0)}%
          </div>
        </div>
      )}
      {hasSignal && (
        <div className="header-stat">
          <div className="header-stat-label">Signal</div>
          <div className="header-stat-value">
            <SignalIcon bars={signalBars} />
            {signal.toFixed(0)}
          </div>
        </div>
      )}
      {hasPacket && (
        <div className="header-stat">
          <div className="header-stat-label">Last Packet</div>
          <div className="header-stat-value">
            {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            <span className="header-stat-ago">&middot; {relativeAgo(created, now)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
