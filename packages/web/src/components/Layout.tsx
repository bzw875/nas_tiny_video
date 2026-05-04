import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app-shell">
      <nav className="top">
        <div className="nav-brand">
          <span className="brand-icon">▶</span>
        </div>
        <div className="nav-links">
          <NavLink to="/novels" className={({ isActive }) => (isActive ? 'active' : '')}>
            小说
          </NavLink>
          <NavLink to="/videos" className={({ isActive }) => (isActive ? 'active' : '')}>
            视频
          </NavLink>
          <NavLink to="/folders" className={({ isActive }) => (isActive ? 'active' : '')}>
            目录
          </NavLink>
          <NavLink to="/tags" className={({ isActive }) => (isActive ? 'active' : '')}>
            标签
          </NavLink>
          <NavLink to="/aish123" className={({ isActive }) => (isActive ? 'active' : '')}>
            aish123
          </NavLink>
          <a href="http://192.168.1.19:61208/" target="_blank" rel="noopener noreferrer">
          glances
          </a>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}