import { NavLink, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Home,
  BookOpen,
  Map,
  BarChart3,
  User,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/path', label: 'Path', icon: Map },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { student } = useApp();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-ink-950 bg-grid-pattern">
      {/* Top nav */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isLanding ? 'bg-transparent' : 'glass border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white hidden sm:block">
                AI<span className="gradient-text">Teacher</span>
              </span>
            </NavLink>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? 'text-white bg-violet-500/15'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Mobile: just logo + avatar */}
            <div className="md:hidden flex items-center gap-2">
              {student && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                  {student.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Desktop avatar */}
            {student ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-slate-300">{student.name}</span>
              </div>
            ) : (
              <NavLink to="/setup" className="hidden md:flex items-center gap-2 btn-primary text-sm py-2 px-4">
                <Sparkles className="w-4 h-4" />
                Get Started
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      {!isLanding && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                    isActive ? 'text-violet-400' : 'text-slate-500'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <main className={`${isLanding ? '' : 'pt-16'} pb-20 md:pb-0`}>{children}</main>
    </div>
  );
}
