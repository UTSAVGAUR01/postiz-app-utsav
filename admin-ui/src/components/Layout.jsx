import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/dashboard',   label: '⬡ Dashboard' },
  { to: '/credentials', label: '🔑 Credentials' },
  { to: '/providers',   label: '🔗 Providers' },
  { to: '/posts',       label: '📝 Posts' },
]

export default function Layout({ children, onLogout }) {
  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-logo">Postiz <span>Admin</span></div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            {n.label}
          </NavLink>
        ))}
        <div className="sidebar-spacer" />
        <a
          href="http://localhost:4007"
          target="_blank"
          rel="noreferrer"
          className="nav-link"
          style={{ borderTop: '1px solid #334155', paddingTop: 14 }}
        >
          ↗ Open Postiz
        </a>
        <button className="nav-link" onClick={onLogout}>⏻ Sign Out</button>
      </nav>
      <main className="content">{children}</main>
    </div>
  )
}
