import { metricMeta, METRIC_SCALE } from '../theme/metrics';
import { metricStatus } from '../theme/metricStatus';
import MetricIcon from './MetricIcons';

const FIELDS = ['temp', 'humidity', 'rainfall', 'wind_speed'];

// Summary values are decimal strings, or null when the period has no readings.
function toNumberOrNull(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

// Rainfall comes back as a reset-aware `total` only, by design — the device's
// counter restarts on reset, so an avg/min/max of it would be meaningless.
function readField(summary, key) {
  const raw = summary?.[key];
  if (key === 'rainfall') {
    return { value: toNumberOrNull(raw?.total), min: null, max: null, isTotal: true };
  }
  return {
    value: toNumberOrNull(raw?.avg),
    min: toNumberOrNull(raw?.min),
    max: toNumberOrNull(raw?.max),
    isTotal: false,
  };
}

function clampPct(value) {
  return Math.min(100, Math.max(0, value));
}

function formatTime(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AverageTiles({ summary }) {
  if (!summary) return null;

  const isSingleDay = Boolean(summary.date) || summary.start_date === summary.end_date;
  const period = isSingleDay ? 'Day' : 'Range';
  const lastReading = summary.current_recorded_at ? formatTime(summary.current_recorded_at) : null;

  return (
    <div className="average-panel">
      <div className="average-panel-header">
        <div className="section-label" style={{ margin: 0 }}>Summary</div>
      </div>

      <div className="average-tiles">
        {FIELDS.map((key) => {
          const meta = metricMeta(key);
          const scale = METRIC_SCALE[key];
          const { value, min, max, isTotal } = readField(summary, key);
          const status = metricStatus(key, value, min, max);

          const scalePct = (v) => clampPct(((v - scale.min) / (scale.max - scale.min)) * 100);
          // A total fills from zero; an average shows its min–max spread plus a marker.
          const barLeft = isTotal ? (value != null ? 0 : null) : min != null ? scalePct(min) : null;
          const barRight = isTotal ? (value != null ? scalePct(value) : null) : max != null ? scalePct(max) : null;
          const markerPct = !isTotal && value != null ? scalePct(value) : null;
          const spread = min != null && max != null ? max - min : null;

          return (
            <div className="average-tile" key={key}>
              <div className="average-tile-label">
                <span className="average-tile-icon" style={{ '--metric-color': meta.color }}>
                  <MetricIcon metric={key} width={18} height={18} />
                </span>
                <span className="average-tile-name">{meta.label}</span>
              </div>

              <div className="average-tile-value">
                {value != null ? value.toFixed(key === 'humidity' ? 0 : 2) : '—'}
                <span className="average-tile-unit">{meta.unit}</span>
              </div>
              <div className="average-tile-subtitle">
                {period} {isTotal ? 'total' : 'average'}
              </div>

              <div className="average-scale">
                <div className="average-scale-track">
                  {barLeft != null && barRight != null && (
                    <div
                      className="average-scale-spread"
                      style={{
                        left: `${barLeft}%`,
                        width: `${Math.max(barRight - barLeft, 1.5)}%`,
                        background: meta.color,
                      }}
                    />
                  )}
                  {markerPct != null && (
                    <div className="average-scale-marker" style={{ left: `${markerPct}%`, background: meta.color }} />
                  )}
                </div>
                <div className="average-scale-labels">
                  <span>{scale.min}</span>
                  <span className="average-scale-spread-text">
                    {spread == null ? '' : spread > 0 ? `spread ${spread.toFixed(1)} ${meta.unit}` : 'no variation'}
                  </span>
                  <span>
                    {scale.max} {meta.unit}
                  </span>
                </div>
              </div>

              <div className="average-stats-row">
                {!isTotal && (
                  <>
                    <div className="average-stat">
                      <div className="average-stat-label">Min</div>
                      <div className="average-stat-value">{min != null ? min.toFixed(2) : '—'}</div>
                    </div>
                    <div className="average-stat">
                      <div className="average-stat-label">Max</div>
                      <div className="average-stat-value">{max != null ? max.toFixed(2) : '—'}</div>
                    </div>
                  </>
                )}
                <div className="average-stat">
                  <div className="average-stat-label">Status</div>
                  <div className={`average-stat-value average-status-${status?.tone || 'neutral'}`}>
                    {status ? status.label : '—'}
                    {status?.flagged && <span className="average-status-flag"> · verify</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="average-panel-footer">
        <span>Bars sit on each sensor's full scale; the marker is the average, rainfall fills to its total.</span>
        {lastReading && <span>Last reading {lastReading}</span>}
      </div>
    </div>
  );
}
