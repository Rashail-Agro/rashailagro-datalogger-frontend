import { useEffect, useMemo, useState } from 'react';
import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HIDDEN_KEYS, TIME_KEYS, metricMeta } from '../theme/metrics';

const DEFAULT_ON = new Set(['temp', 'humidity', 'wind_speed', 'rainfall']);
const DAY_MS = 24 * 60 * 60 * 1000;

// Each metric gets its own y-axis: humidity (0–100) sharing a scale with
// wind speed (~0–5) would flatten the smaller series into a line at the bottom.
const AXIS_ORIENTATION = { temp: 'left', humidity: 'right', wind_speed: 'left', rainfall: 'right' };
const AXIS_DOMAIN = {
  humidity: [0, 100],
  wind_speed: [0, 'auto'],
  rainfall: [0, (dataMax) => Math.max(1, dataMax)],
};
const MIN_ZOOM_SPAN = 5;
const ZOOM_FACTOR = 0.6;

function isNumericLike(value) {
  return value !== '' && value !== null && !Number.isNaN(Number(value));
}

function makeTickFormatter(multiDay) {
  return (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!multiDay) return time;
    return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${time}`;
  };
}

function ChartTooltip({ active, payload, label, visible }) {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-time">
        {Number.isNaN(d.getTime()) ? label : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })}
      </div>
      {payload
        .filter((p) => visible.has(p.dataKey))
        .map((p) => {
          const meta = metricMeta(p.dataKey);
          return (
            <div key={p.dataKey} className="chart-tooltip-row">
              <span className="stat-dot" style={{ background: meta.color }} />
              {meta.label}: <strong>{p.value}{meta.unit}</strong>
            </div>
          );
        })}
    </div>
  );
}

export default function TelemetryChart({ rows }) {
  const { timeKey, numericKeys } = useMemo(() => {
    if (!rows.length) return { timeKey: null, numericKeys: [] };
    const keys = Object.keys(rows[0]).filter((k) => !HIDDEN_KEYS.has(k));
    const tKey = keys.find((k) => TIME_KEYS.includes(k.toLowerCase())) || keys[0];
    // wind_direction is categorical (compass point), not a plottable magnitude
    const nKeys = keys.filter((k) => k !== tKey && k !== 'wind_direction' && isNumericLike(rows[0][k]));
    return { timeKey: tKey, numericKeys: nKeys };
  }, [rows]);

  const [visible, setVisible] = useState(DEFAULT_ON);

  const chartData = useMemo(() => {
    if (!timeKey) return [];
    const sorted = [...rows].sort((a, b) => new Date(a[timeKey]) - new Date(b[timeKey]));
    return sorted.map((row) => {
      const point = { [timeKey]: row[timeKey] };
      numericKeys.forEach((k) => {
        point[k] = Number(row[k]);
      });
      return point;
    });
  }, [rows, timeKey, numericKeys]);

  const formatTick = useMemo(() => {
    if (chartData.length < 2) return makeTickFormatter(false);
    const span = new Date(chartData[chartData.length - 1][timeKey]) - new Date(chartData[0][timeKey]);
    return makeTickFormatter(span > DAY_MS);
  }, [chartData, timeKey]);

  function toggle(key) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const lastIndex = Math.max(0, chartData.length - 1);
  const [range, setRange] = useState({ startIndex: 0, endIndex: lastIndex });

  useEffect(() => {
    setRange({ startIndex: 0, endIndex: Math.max(0, chartData.length - 1) });
  }, [chartData.length]);

  function zoomBy(factor) {
    setRange((r) => {
      const span = r.endIndex - r.startIndex;
      const center = (r.startIndex + r.endIndex) / 2;
      const newSpan = Math.max(MIN_ZOOM_SPAN, Math.min(lastIndex, Math.round(span * factor)));
      let start = Math.round(center - newSpan / 2);
      let end = start + newSpan;
      if (start < 0) {
        end -= start;
        start = 0;
      }
      if (end > lastIndex) {
        start -= end - lastIndex;
        end = lastIndex;
      }
      return { startIndex: Math.max(0, start), endIndex: Math.min(lastIndex, end) };
    });
  }

  const isZoomedIn = range.endIndex - range.startIndex < lastIndex;

  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);

  // recharts v3 calls chart mouse handlers as (state, nativeEvent) —
  // the chart's activeLabel lives on `state`, not on the native event.
  // Without preventDefault, a real mousedown+drag over the SVG's <text>
  // tick labels starts the browser's native text-selection drag instead,
  // which swallows the following mousemove events (only reproduces with
  // real pointer input — synthetic/automated drags don't trigger it).
  function handleMouseDown(state, event) {
    event?.preventDefault?.();
    if (state?.activeLabel == null) return;
    setDragStart(state.activeLabel);
    setDragEnd(state.activeLabel);
  }

  function handleMouseMove(state) {
    if (dragStart == null || state?.activeLabel == null) return;
    setDragEnd(state.activeLabel);
  }

  function handleMouseUp() {
    if (dragStart == null || dragEnd == null || dragStart === dragEnd) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    const iStart = chartData.findIndex((d) => d[timeKey] === dragStart);
    const iEnd = chartData.findIndex((d) => d[timeKey] === dragEnd);
    if (iStart !== -1 && iEnd !== -1) {
      const start = Math.min(iStart, iEnd);
      const end = Math.max(iStart, iEnd);
      if (end - start >= 1) {
        setRange({ startIndex: start, endIndex: end });
      }
    }
    setDragStart(null);
    setDragEnd(null);
  }

  if (!timeKey || numericKeys.length === 0) return null;

  return (
    <div className="telemetry-chart">
      <div className="telemetry-header-row">
        <div className="telemetry-metrics-row">
          <span className="telemetry-metrics-label">Visible Metrics</span>
          {numericKeys.map((key) => {
            const meta = metricMeta(key);
            return (
              <label key={key} className="telemetry-checkbox">
                <input
                  type="checkbox"
                  checked={visible.has(key)}
                  onChange={() => toggle(key)}
                />
                <span className="stat-dot" style={{ background: meta.color }} />
                {meta.label}
                {meta.unit && ` (${meta.unit})`}
              </label>
            );
          })}
        </div>

        <div className="chart-zoom-toolbar">
          <button type="button" className="chart-zoom-btn" onClick={() => zoomBy(ZOOM_FACTOR)} title="Zoom in" aria-label="Zoom in">
            +
          </button>
          <button type="button" className="chart-zoom-btn" onClick={() => zoomBy(1 / ZOOM_FACTOR)} title="Zoom out" aria-label="Zoom out">
            &minus;
          </button>
          <button
            type="button"
            className="chart-zoom-btn"
            onClick={() => setRange({ startIndex: 0, endIndex: lastIndex })}
            disabled={!isZoomedIn}
            title="Reset zoom"
            aria-label="Reset zoom"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <path d="M4 4v6h6M20 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 10a8 8 0 0 1 14.5-4.5M20 14a8 8 0 0 1-14.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart
          data={chartData}
          margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: 'crosshair', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <CartesianGrid stroke="#e1e0d9" vertical={false} />
          <XAxis
            dataKey={timeKey}
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: '#898781' }}
            axisLine={{ stroke: '#c3c2b7' }}
            tickLine={false}
            minTickGap={80}
            allowDataOverflow
          />
          {numericKeys.map((key) => {
            const meta = metricMeta(key);
            return (
              <YAxis
                key={key}
                yAxisId={key}
                orientation={AXIS_ORIENTATION[key] || 'right'}
                domain={AXIS_DOMAIN[key] || ['auto', 'auto']}
                hide={!visible.has(key)}
                width={44}
                tick={{ fontSize: 11, fill: meta.color }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}${meta.unit}`}
              />
            );
          })}
          <Tooltip content={<ChartTooltip visible={visible} />} />
          <Legend
            onClick={(e) => toggle(e.dataKey)}
            wrapperStyle={{ fontSize: 12, cursor: 'pointer' }}
          />
          {numericKeys.map((key) => {
            const meta = metricMeta(key);
            return (
              <Line
                key={key}
                yAxisId={key}
                type="monotone"
                dataKey={key}
                name={meta.unit ? `${meta.label} (${meta.unit})` : meta.label}
                stroke={meta.color}
                strokeWidth={1.5}
                dot={false}
                hide={!visible.has(key)}
                isAnimationActive={false}
              />
            );
          })}
          {dragStart != null && dragEnd != null && dragStart !== dragEnd && (
            <ReferenceArea yAxisId={numericKeys[0]} x1={dragStart} x2={dragEnd} strokeOpacity={0.3} fill="#16a34a" fillOpacity={0.15} />
          )}
          <Brush
            dataKey={timeKey}
            height={24}
            stroke="#16a34a"
            travellerWidth={8}
            tickFormatter={formatTick}
            startIndex={range.startIndex}
            endIndex={range.endIndex}
            onChange={(r) => setRange({ startIndex: r.startIndex, endIndex: r.endIndex })}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
