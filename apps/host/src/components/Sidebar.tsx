import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Terminal,
  Settings,
  Github,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs', icon: ListChecks, label: 'Jobs' },
  { to: '/logs', icon: Terminal, label: 'Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-github-surface border-r border-github-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-github-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-github-bg rounded-lg flex items-center justify-center">
            <Github className="w-6 h-6 text-github-info" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-github-text">Birch Host</h1>
            <p className="text-xs text-github-muted">GitHub Actions Runner</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-github-accent/20 text-github-accent border border-github-accent/30'
                      : 'text-github-muted hover:text-github-text hover:bg-github-bg'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-github-border">
        <div className="text-xs text-github-muted text-center">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </aside>
  );
}

