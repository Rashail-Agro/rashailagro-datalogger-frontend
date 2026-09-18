import { useEffect, useMemo, useRef, useState } from 'react';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromISO(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(iso) {
  const d = fromISO(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  return cells;
}

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState(startDate);
  const [pendingEnd, setPendingEnd] = useState(endDate);
  const [viewDate, setViewDate] = useState(() => fromISO(startDate));
  const rootRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setPendingStart(startDate);
      setPendingEnd(endDate);
      setViewDate(fromISO(startDate));
    }
  }, [open, startDate, endDate]);

  const cells = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const today = toISO(new Date());

  function handleDayClick(date) {
    const iso = toISO(date);
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(iso);
      setPendingEnd(null);
      return;
    }
    if (iso < pendingStart) {
      setPendingEnd(pendingStart);
      setPendingStart(iso);
    } else {
      setPendingEnd(iso);
    }
  }

  useEffect(() => {
    if (pendingStart && pendingEnd) {
      onChange(pendingStart, pendingEnd);
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStart, pendingEnd]);

  function changeMonth(delta) {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  function cellState(date) {
    if (!date) return '';
    const iso = toISO(date);
    if (pendingStart && iso === pendingStart) return 'range-start';
    if (pendingEnd && iso === pendingEnd) return 'range-end';
    if (pendingStart && pendingEnd && iso > pendingStart && iso < pendingEnd) return 'in-range';
    if (pendingStart && !pendingEnd && iso === pendingStart) return 'range-start';
    return '';
  }

  return (
    <div className="date-range-field" ref={rootRef}>
      <button
        type="button"
        className="date-range-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        {startDate && endDate ? (
          <span>{formatDisplay(startDate)} &rarr; {formatDisplay(endDate)}</span>
        ) : (
          <span className="date-range-placeholder">Select Date Range</span>
        )}
      </button>

      {open && (
        <div className="date-range-popover">
          <div className="date-range-header">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="date-range-weekdays">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>

          <div className="date-range-grid">
            {cells.map((date, i) => {
              if (!date) return <span key={`empty-${i}`} />;
              const iso = toISO(date);
              const state = cellState(date);
              return (
                <button
                  type="button"
                  key={iso}
                  className={`date-cell${state ? ` ${state}` : ''}${iso === today ? ' is-today' : ''}`}
                  onClick={() => handleDayClick(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-range-hint">
            {!pendingStart && 'Pick a start date'}
            {pendingStart && !pendingEnd && 'Pick an end date'}
          </div>
        </div>
      )}
    </div>
  );
}
