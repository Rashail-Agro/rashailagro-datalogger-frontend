import { HIDDEN_KEYS, metricMeta, windDirectionLabel, windDirectionDegrees } from '../theme/metrics';
import MetricIcon from './MetricIcons';

const COLUMN_ORDER = ['_date', '_time', 'temp', 'humidity', 'rainfall', 'wind_speed', 'wind_direction'];

const SHORT_LABELS = {
  temp: 'Temp',
  humidity: 'Humidity',
  rainfall: 'Rainfall',
  wind_speed: 'Wind',
  wind_direction: 'Direction',
  _date: 'Date',
  _time: 'Time',
};

export function visibleColumns(columns) {
  const visible = columns.filter((col) => !HIDDEN_KEYS.has(col) && col !== 'id');
  const hasReceivedAt = visible.includes('received_at');
  const withVirtual = hasReceivedAt
    ? ['_date', '_time', ...visible.filter((col) => col !== 'received_at')]
    : visible;

  const ordered = COLUMN_ORDER.filter((col) => withVirtual.includes(col));
  const rest = withVirtual.filter((col) => !COLUMN_ORDER.includes(col));
  return [...ordered, ...rest];
}

function columnLabel(col) {
  return SHORT_LABELS[col] || metricMeta(col).label;
}

function WindDirectionCell({ value, degreesValue }) {
  if (value === '' || value === null || value === undefined) return '';
  const degrees = windDirectionDegrees(value, degreesValue);
  return (
    <span className="wind-dir-cell">
      {degrees != null && (
        <svg viewBox="0 0 24 24" width="14" height="14" style={{ transform: `rotate(${degrees}deg)` }}>
          <path d="M12 3v18M12 3l-5 5M12 3l5 5" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {windDirectionLabel(value)}
    </span>
  );
}

function renderCell(col, row) {
  if (col === '_date' || col === '_time') {
    const d = new Date(row.received_at);
    if (Number.isNaN(d.getTime())) return '';
    return col === '_date'
      ? d.toLocaleDateString([], { dateStyle: 'medium' })
      : d.toLocaleTimeString([], { timeStyle: 'short' });
  }
  if (col === 'wind_direction') {
    return <WindDirectionCell value={row[col]} degreesValue={row.wind_direction_degrees} />;
  }
  return String(row[col] ?? '');
}

// startIndex is how many rows precede this page, so S.No keeps counting across
// pages (page 2 of 25-row pages starts at 26) instead of restarting at 1.
export default function DataTable({ rows, columns, startIndex = 0 }) {
  if (!rows.length) return null;
  const cols = visibleColumns(columns);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-sno">
              <span className="th-label">S.No</span>
            </th>
            {cols.map((col) => (
              <th key={col}>
                <span className="th-label">
                  <MetricIcon metric={col} width={14} height={14} />
                  {columnLabel(col)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              <td className="cell-time col-sno">{startIndex + i + 1}</td>
              {cols.map((col) => (
                <td key={col} className={col === '_date' || col === '_time' ? 'cell-time' : 'cell-num'}>
                  {renderCell(col, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
