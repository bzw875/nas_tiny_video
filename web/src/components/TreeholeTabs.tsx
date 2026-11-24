import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/treehole', label: '树洞', end: true },
  { to: '/treehole/search', label: '搜索', end: false },
  { to: '/treehole/statistics', label: '统计', end: false },
  { to: '/treehole/aish', label: 'Aish', end: false },
];

export function TreeholeTabs() {
  return (
    <nav className="th-tabs" aria-label="树洞导航">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
