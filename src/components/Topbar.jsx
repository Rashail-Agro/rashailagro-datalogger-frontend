function initials(name) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

export default function Topbar({ user, onLogout, recordCount, onToggleSidebar }) {
  const name = user?.username || user?.email || 'User';

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-menu-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle devices menu"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="topbar-brand">
        <img className="topbar-brand-icon" src="/logo.svg" alt="" />
        <span className="topbar-brand-text">Weather Station</span>
      </div>

      <div className="topbar-company">SVHSPL</div>

      <div className="topbar-right">
        {recordCount > 0 && (
          <>
            <span className="topbar-record-count">{recordCount} Records</span>
            <span className="topbar-divider" />
          </>
        )}
        <div className="topbar-avatar">{initials(name)}</div>
        <span className="topbar-username">{name}</span>
        <button type="button" className="topbar-logout" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
