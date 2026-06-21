import { Outlet, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Package, ShoppingCart,
  UtensilsCrossed, BarChart2, Settings,
  Refrigerator, ScanLine,
} from 'lucide-react'
import clsx from 'clsx'
import { receiptsApi, type Receipt } from '@/services/api'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',   badge: false },
  { to: '/inventory',  icon: Package,         label: 'Inventário',  badge: false },
  { to: '/taloes',     icon: ScanLine,        label: 'Talões',      badge: true  },
  { to: '/shopping',   icon: ShoppingCart,    label: 'Compras',     badge: false },
  { to: '/meals',      icon: UtensilsCrossed, label: 'Refeições',   badge: false },
  { to: '/reports',    icon: BarChart2,       label: 'Relatórios',  badge: false },
  { to: '/settings',   icon: Settings,        label: 'Definições',  badge: false },
]

export default function Layout() {
  // Contagem de talões pendentes para badge (usa cache partilhado com Dashboard e Taloes)
  const { data: receipts = [] } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptsApi.getAll().then(r => r.data as Receipt[]),
    refetchInterval: 60_000,
  })
  const pendingCount = receipts.filter(r => r.status === 'pending').length

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-nerv-bg)' }}>
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        <div className="flex items-center gap-2 px-4 py-4 border-b"
          style={{ borderColor: 'var(--color-nerv-border)' }}>
          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            PA
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-nerv-text)' }}>
            nerv-pantry
          </span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                isActive ? 'text-white font-medium' : 'hover:text-white',
              )}
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)',
                backgroundColor: isActive ? 'var(--color-nerv-border)' : 'transparent',
              })}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {badge && pendingCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none"
                  style={{ backgroundColor: 'var(--color-nerv-warning)', color: '#000' }}>
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t text-xs"
          style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)' }}>
          <div className="flex items-center gap-1.5">
            <Refrigerator size={12} />
            v0.1.0
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — mobile */}
        <header className="md:hidden flex items-center px-4 py-3 border-b"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
              PA
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--color-nerv-text)' }}>
              nerv-pantry
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>

        {/* Bottom nav — mobile */}
        <nav className="md:hidden flex border-t"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          {navItems.slice(0, 5).map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors relative"
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-nerv-accent)' : 'var(--color-nerv-muted)',
              })}>
              <div className="relative">
                <Icon size={18} />
                {badge && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-2 text-xs w-4 h-4 flex items-center justify-center rounded-full font-bold"
                    style={{ backgroundColor: 'var(--color-nerv-warning)', color: '#000', fontSize: '9px' }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}