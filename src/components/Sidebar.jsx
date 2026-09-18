const DEVICE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 14a4 4 0 1 1 1.1-7.85A5 5 0 0 1 17 8a3.5 3.5 0 0 1-.5 6.98H6Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 17v2M12 17v2.5M16 17v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

export default function Sidebar({ devices, activeId, onSelect, statusById, open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-section-label">Devices</div>
        <nav className="sidebar-nav">
          {devices.map((d) => {
            const status = statusById?.[d.id];
            return (
              <button
                key={d.id}
                type="button"
                className={`sidebar-item${d.id === activeId ? ' active' : ''}`}
                onClick={() => {
                  onSelect(d.id);
                  onClose?.();
                }}
              >
                <span className="sidebar-item-icon">{DEVICE_ICON}</span>
                <span className="sidebar-item-body">
                  <span className="sidebar-item-name" title={d.name}>{d.name}</span>
                  {status && (
                    <span className={`sidebar-status sidebar-status-${status}`}>
                      <span className="sidebar-status-dot" />
                      {status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
