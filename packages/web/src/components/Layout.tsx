import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app-shell">
      <nav className="top">
        <NavLink to="/novels" className={({ isActive }) => (isActive ? 'active' : '')}>
          风雨楼
        </NavLink>
        <NavLink to="/videos" className={({ isActive }) => (isActive ? 'active' : '')}>
          全部视频
        </NavLink>
        <NavLink to="/folders" className={({ isActive }) => (isActive ? 'active' : '')}>
          目录视图
        </NavLink>
        <NavLink to="/tags" className={({ isActive }) => (isActive ? 'active' : '')}>
          标签管理
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
